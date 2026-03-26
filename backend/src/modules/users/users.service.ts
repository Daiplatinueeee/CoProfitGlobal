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

  private async generateUniquePackagePin(prefix = 'CPG'): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const pin = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
      const exists = await this.userModel.exists({ packagePin: pin });
      if (!exists) return pin;
    }

    throw new ConflictException('Unable to generate unique package pin');
  }

  private async createUserRecord(input: {
    name: string;
    username?: string;
    email: string;
    passwordHash: string;
    role: SystemRole;
    membershipTier: MembershipTier;
    sponsorId?: Types.ObjectId | null;
    packagePin?: string;
    age?: number;
    contact?: string;
    address?: string;
    beneficiary?: string;
    birthday?: string;
  }): Promise<User> {
    const email = input.email.toLowerCase().trim();
    const name = input.name.trim();
    const username = input.username?.trim() || name;
    const packagePin = (input.packagePin ?? '').trim();

    const createPayload = {
      name,
      username,
      email,
      passwordHash: input.passwordHash,
      role: input.role,
      membershipTier: input.membershipTier,
      sponsorId: input.sponsorId ?? null,

      packagePin,
      age: input.age ?? null,
      contact: input.contact ?? '',
      address: input.address ?? '',
      beneficiary: input.beneficiary ?? '',
      birthday: input.birthday ?? '',
    };

    try {
      const created = await this.userModel.create(createPayload);
      return created;
    } catch (err: any) {
      if (err?.code === 11000) {
        if (err?.keyPattern?.email) {
          throw new ConflictException('Email already in use');
        }

        if (err?.keyPattern?.packagePin) {
          throw new ConflictException('Package pin already in use');
        }

        if (err?.keyPattern?.referralCode) {
          try {
            const created = await this.userModel.create({
              ...createPayload,
              referralCode: undefined,
            });
            return created;
          } catch (e: any) {
            if (e?.code === 11000 && e?.keyPattern?.email) {
              throw new ConflictException('Email already in use');
            }
            if (e?.code === 11000 && e?.keyPattern?.packagePin) {
              throw new ConflictException('Package pin already in use');
            }
            throw e;
          }
        }

        throw new ConflictException('Duplicate field value');
      }

      throw err;
    }
  }

  async createUser(input: {
    name: string;
    username?: string;
    email: string;
    passwordHash: string;
    role?: SystemRole;
    membershipTier?: MembershipTier;
    sponsorReferralCode?: string;
    packagePin?: string;  // optional — auto-generated if not supplied
    age?: number;
    contact?: string;
    address?: string;
    beneficiary?: string;
    birthday?: string;
  }): Promise<User> {
    let sponsorId: Types.ObjectId | null = null;

    if (input.sponsorReferralCode) {
      const sponsor = await this.userModel
        .findOne({ referralCode: input.sponsorReferralCode.trim() })
        .exec();

      if (!sponsor) {
        throw new BadRequestException('Invalid referral code');
      }

      sponsorId = sponsor._id as Types.ObjectId;
    }

    return this.createUserRecord({
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role ?? SystemRole.USER,
      membershipTier: input.membershipTier ?? MembershipTier.BRONZE,
      sponsorId,

      packagePin: input.packagePin?.trim() || (await this.generateUniquePackagePin('CPG')),
      age: input.age,
      contact: input.contact,
      address: input.address,
      beneficiary: input.beneficiary,
      birthday: input.birthday,
    });
  }

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

    try {
      return await this.userModel.create({
        name: input.name.trim(),
        username: input.username?.trim() || input.name.trim(),
        email: input.email.toLowerCase().trim(),
        passwordHash: input.passwordHash,
        role: SystemRole.ADMIN,
        membershipTier: MembershipTier.BRONZE,
        sponsorId: null,
        packagePin,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        if (err?.keyPattern?.email) {
          throw new ConflictException('Email already in use');
        }

        if (err?.keyPattern?.packagePin) {
          throw new ConflictException('Package pin already in use');
        }

        throw new ConflictException('Duplicate field value');
      }

      throw err;
    }
  }

  async updateMembershipTier(userId: string, membershipTier: MembershipTier) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { membershipTier } },
      {
        new: true,
        projection: {
          name: 1,
          username: 1,
          email: 1,
          role: 1,
          membershipTier: 1,
          referralCode: 1,
          sponsorId: 1,
          packagePin: 1,
          age: 1,
          contact: 1,
          address: 1,
          beneficiary: 1,
          birthday: 1,
        },
      },
    );

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return {
      id: updated._id.toString(),
      name: updated.name,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      membershipTier: updated.membershipTier,
      referralCode: updated.referralCode,
      sponsorId: updated.sponsorId ? updated.sponsorId.toString() : null,
      packagePin: (updated as any).packagePin,
      age: (updated as any).age,
      contact: (updated as any).contact,
      address: (updated as any).address,
      beneficiary: (updated as any).beneficiary,
      birthday: (updated as any).birthday,
    };
  }

  async findByEmailWithPassword(
    email: string,
  ): Promise<(User & { passwordHash: string }) | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash')
      .exec() as any;
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdWithRefreshSessions(userId: string) {
    return this.userModel.findById(userId).select('+refreshSessions').exec();
  }

  async findByReferralCode(code: string) {
    return this.userModel.findOne({ referralCode: code.trim() }).exec();
  }

  async addRefreshSession(params: {
    userId: string;
    sid: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }) {
    if (!Types.ObjectId.isValid(params.userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const exists = await this.userModel.exists({ _id: params.userId });
    if (!exists) {
      throw new NotFoundException('User not found');
    }

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
    if (!Types.ObjectId.isValid(params.userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const setPayload: Record<string, any> = {
      'refreshSessions.$.refreshTokenHash': params.newRefreshTokenHash,
      'refreshSessions.$.expiresAt': params.newExpiresAt,
    };

    if (params.userAgent !== undefined) {
      setPayload['refreshSessions.$.userAgent'] = params.userAgent;
    }

    if (params.ip !== undefined) {
      setPayload['refreshSessions.$.ip'] = params.ip;
    }

    const result = await this.userModel.updateOne(
      {
        _id: params.userId,
        'refreshSessions.sid': params.sid,
      },
      {
        $set: setPayload,
      },
    );

    if (result.matchedCount === 0) {
      const exists = await this.userModel.exists({ _id: params.userId });
      if (!exists) {
        throw new NotFoundException('User not found');
      }
      return false;
    }

    return true;
  }

  async removeRefreshSession(userId: string, sid: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const exists = await this.userModel.exists({ _id: userId });
    if (!exists) return;

    await this.userModel.updateOne(
      { _id: userId },
      {
        $pull: {
          refreshSessions: { sid },
        },
      },
    );
  }

  async removeAllRefreshSessions(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const exists = await this.userModel.exists({ _id: userId });
    if (!exists) return;

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          refreshSessions: [],
        },
      },
    );
  }
}