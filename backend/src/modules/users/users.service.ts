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

  private async createUserRecord(input: {
    name: string;
    username?: string;
    email: string;
    passwordHash: string;
    role: SystemRole;
    membershipTier: MembershipTier;
    sponsorId?: Types.ObjectId | null;
  }): Promise<User> {
    const email = input.email.toLowerCase().trim();
    const name = input.name.trim();
    const username = input.username?.trim() || name;

    const createPayload = {
      name,
      username,
      email,
      passwordHash: input.passwordHash,
      role: input.role,
      membershipTier: input.membershipTier,
      sponsorId: input.sponsorId ?? null,
    };

    try {
      const created = await this.userModel.create(createPayload);
      return created;
    } catch (err: any) {
      if (err?.code === 11000) {
        if (err?.keyPattern?.email) {
          throw new ConflictException('Email already in use');
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
    });
  }

  async createAdmin(input: {
    name: string;
    username?: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    return this.createUserRecord({
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      role: SystemRole.ADMIN,
      membershipTier: MembershipTier.BRONZE,
      sponsorId: null,
    });
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
    return this.userModel.findOne({ referralCode: code }).exec();
  }

  async addRefreshSession(params: {
    userId: string;
    sid: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }) {
    const user = await this.userModel
      .findById(params.userId)
      .select('+refreshSessions')
      .exec();

    if (!user) throw new NotFoundException('User not found');

    (user as any).refreshSessions.push({
      sid: params.sid,
      refreshTokenHash: params.refreshTokenHash,
      createdAt: new Date(),
      expiresAt: params.expiresAt,
      userAgent: params.userAgent,
      ip: params.ip,
    });

    await user.save();
  }

  async replaceRefreshSession(params: {
    userId: string;
    sid: string;
    newRefreshTokenHash: string;
    newExpiresAt: Date;
    userAgent?: string;
    ip?: string;
  }) {
    const user = await this.userModel
      .findById(params.userId)
      .select('+refreshSessions')
      .exec();

    if (!user) throw new NotFoundException('User not found');

    const sessions = (user as any).refreshSessions as any[];
    const idx = sessions.findIndex((s) => s.sid === params.sid);
    if (idx === -1) return false;

    sessions[idx] = {
      ...sessions[idx],
      refreshTokenHash: params.newRefreshTokenHash,
      expiresAt: params.newExpiresAt,
      userAgent: params.userAgent ?? sessions[idx].userAgent,
      ip: params.ip ?? sessions[idx].ip,
    };

    await user.save();
    return true;
  }

  async removeRefreshSession(userId: string, sid: string) {
    const user = await this.userModel
      .findById(userId)
      .select('+refreshSessions')
      .exec();

    if (!user) return;

    (user as any).refreshSessions = ((user as any).refreshSessions as any[]).filter(
      (s) => s.sid !== sid,
    );

    await user.save();
  }

  async removeAllRefreshSessions(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('+refreshSessions')
      .exec();

    if (!user) return;

    (user as any).refreshSessions = [];
    await user.save();
  }
}