import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  User,
  UserDocument,
  MembershipTier,
  SystemRole,
} from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // ✅ Generate unique package pin
  private async generateUniquePackagePin(prefix = 'CPG'): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const pin = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
      const exists = await this.userModel.exists({ packagePin: pin });
      if (!exists) return pin;
    }
    throw new ConflictException('Unable to generate unique package pin');
  }

  // ✅ Core user creation (single source of truth)
  private async createUserRecord(input: {
    name: string;
    username?: string;
    email: string;
    passwordHash: string;
    role: SystemRole;
    membershipTier: MembershipTier;
    sponsorId?: Types.ObjectId | null;
    packagePin: string;
    age?: number;
    contact?: string;
    address?: string;
    beneficiary?: string;
    birthday?: string;
  }): Promise<User> {
    const payload = {
      name: input.name.trim(),
      username: input.username?.trim() || input.name.trim(),
      email: input.email.toLowerCase().trim(),
      passwordHash: input.passwordHash,
      role: input.role,
      membershipTier: input.membershipTier,
      sponsorId: input.sponsorId ?? null,

      packagePin: input.packagePin,
      age: input.age ?? null,
      contact: input.contact ?? '',
      address: input.address ?? '',
      beneficiary: input.beneficiary ?? '',
      birthday: input.birthday ?? '',
    };

    try {
      return await this.userModel.create(payload);
    } catch (err: any) {
      if (err?.code === 11000) {
        if (err?.keyPattern?.email) {
          throw new ConflictException('Email already in use');
        }
        if (err?.keyPattern?.packagePin) {
          throw new ConflictException('Package pin already in use');
        }
        if (err?.keyPattern?.referralCode) {
          return this.userModel.create({
            ...payload,
            referralCode: undefined,
          });
        }
        throw new ConflictException('Duplicate field value');
      }
      throw err;
    }
  }

  // ✅ Create USER
  async createUser(input: {
    name: string;
    username?: string;
    email: string;
    passwordHash: string;
    role?: SystemRole;
    membershipTier?: MembershipTier;
    sponsorReferralCode?: string;
    packagePin?: string;
    age?: number;
    contact?: string;
    address?: string;
    beneficiary?: string;
    birthday?: string;
  }): Promise<User> {
    let sponsorId: Types.ObjectId | null = null;

    if (input.sponsorReferralCode) {
      const sponsor = await this.userModel.findOne({
        referralCode: input.sponsorReferralCode.trim(),
      });

      if (!sponsor) {
        throw new BadRequestException('Invalid referral code');
      }

      sponsorId = sponsor._id as Types.ObjectId;
    }

    const packagePin =
      input.packagePin?.trim() ||
      (await this.generateUniquePackagePin('CPG'));

    return this.createUserRecord({
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role ?? SystemRole.USER,
      membershipTier: input.membershipTier ?? MembershipTier.BRONZE,
      sponsorId,
      packagePin,
      age: input.age,
      contact: input.contact,
      address: input.address,
      beneficiary: input.beneficiary,
      birthday: input.birthday,
    });
  }

  // ✅ Create ADMIN
  async createAdmin(input: {
    name: string;
    username?: string;
    email: string;
    passwordHash: string;
    packagePin?: string;
  }): Promise<User> {
    const packagePin =
      input.packagePin?.trim() ||
      (await this.generateUniquePackagePin('ADM'));

    return this.createUserRecord({
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      role: SystemRole.ADMIN,
      membershipTier: MembershipTier.BRONZE,
      sponsorId: null,
      packagePin,
    });
  }

  // ✅ Update membership
  async updateMembershipTier(userId: string, membershipTier: MembershipTier) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { membershipTier } },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated;
  }

  // ✅ Finders
  async findByEmailWithPassword(email: string) {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash');
  }

  async findById(id: string) {
    return this.userModel.findById(id);
  }

  async findByIdWithRefreshSessions(userId: string) {
    return this.userModel.findById(userId).select('+refreshSessions');
  }

  async findByReferralCode(code: string) {
    return this.userModel.findOne({ referralCode: code.trim() });
  }

  // ✅ Refresh Sessions
  async addRefreshSession(params: {
    userId: string;
    sid: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }) {
    await this.userModel.updateOne(
      { _id: params.userId },
      {
        $push: {
          refreshSessions: {
            sid: params.sid,
            refreshTokenHash: params.refreshTokenHash,
            createdAt: new Date(),
            expiresAt: params.expiresAt,
            userAgent: params.userAgent,
            ip: params.ip,
          },
        },
      },
    );
  }

  async replaceRefreshSession(params: {
    userId: string;
    sid: string;
    newRefreshTokenHash: string;
    newExpiresAt: Date;
    userAgent?: string;
    ip?: string;
  }) {
    const result = await this.userModel.updateOne(
      { _id: params.userId, 'refreshSessions.sid': params.sid },
      {
        $set: {
          'refreshSessions.$.refreshTokenHash':
            params.newRefreshTokenHash,
          'refreshSessions.$.expiresAt': params.newExpiresAt,
          ...(params.userAgent && {
            'refreshSessions.$.userAgent': params.userAgent,
          }),
          ...(params.ip && {
            'refreshSessions.$.ip': params.ip,
          }),
        },
      },
    );

    return result.matchedCount > 0;
  }

  async removeRefreshSession(userId: string, sid: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { refreshSessions: { sid } } },
    );
  }

  async removeAllRefreshSessions(userId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { refreshSessions: [] } },
    );
  }
}