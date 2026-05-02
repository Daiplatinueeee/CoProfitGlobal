import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserDocument,
  MembershipTier,
  SystemRole,
} from './schemas/user.schema';
import {
  ProductPin,
  ProductPinDocument,
  PinStatus,
} from '../product-pins/schema/product-pins.schema';
import {
  WalletTransaction,
  WalletTransactionDocument,
  WalletCurrency,
  WalletTxnType,
  WalletTxnSource,
} from '../wallet/schemas/wallet-transaction.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(ProductPin.name) private pinModel: Model<ProductPinDocument>,
    @InjectModel(WalletTransaction.name) private txnModel: Model<WalletTransactionDocument>,
  ) {}

  async lookupPin(pin: string): Promise<{ found: boolean; status?: string; tier?: string }> {
    const doc = await this.pinModel
      .findOne({ pin: pin.trim().toUpperCase() })
      .select('status tier')
      .lean();

    if (!doc) return { found: false };
    return { found: true, status: (doc as any).status, tier: (doc as any).tier };
  }

  private static readonly TIER_RANK: Record<string, number> = {
    free: 0, bronze: 1, silver: 2, gold: 3, platinum: 4,
  };

  async upgradeSubscription(userId: string, pin: string): Promise<{ newTier: string }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const clean = pin.trim().toUpperCase();
    const pinDoc = await this.pinModel.findOne({ pin: clean });

    if (!pinDoc) throw new BadRequestException('PIN not found');
    if (pinDoc.status !== PinStatus.UNUSED) {
      throw new BadRequestException(
        pinDoc.status === PinStatus.USED
          ? 'This PIN has already been used'
          : 'This PIN is no longer valid',
      );
    }

    const newTier = pinDoc.tier as MembershipTier;
    const uid = new Types.ObjectId(userId);

    const user = await this.userModel.findById(uid).select('membershipTier').lean();
    if (!user) throw new NotFoundException('User not found');

    const currentRank = UsersService.TIER_RANK[(user as any).membershipTier?.toLowerCase()] ?? 0;
    const newRank     = UsersService.TIER_RANK[newTier.toLowerCase()] ?? 0;

    if (newRank <= currentRank) {
      throw new BadRequestException(
        newRank === currentRank
          ? 'You are already on this tier'
          : 'You cannot downgrade to a lower tier',
      );
    }

    await this.userModel.updateOne(
      { _id: uid },
      { $set: { membershipTier: newTier, packagePin: clean, tierUpgradedAt: new Date() } },
    );

    await this.pinModel.updateOne(
      { _id: pinDoc._id },
      { $set: { status: PinStatus.USED, usedByUserId: uid, usedAt: new Date() } },
    );

    const previousTier = (user as any).membershipTier as string;
    await this.txnModel.create({
      userId:   uid,
      currency: WalletCurrency.PHP,
      type:     WalletTxnType.CREDIT,
      amount:   0.01,
      source:   WalletTxnSource.TIER_UPGRADE,
      refKey:   `tier_upgrade:${uid.toString()}:${clean}`,
      note:     `Package upgraded from ${previousTier} → ${newTier} using PIN ${clean}`,
      meta:     { previousTier, newTier, pin: clean },
      postedAt: new Date(),
    }).catch(() => {});

    return { newTier };
  }

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
      { returnDocument: 'after' },
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

  // ✅ Update editable profile fields
  async updateProfile(
    userId: string,
    data: {
      name?: string;
      username?: string;
      email?: string;
      contact?: string;
      address?: string;
      beneficiary?: string;
      birthday?: string;
      age?: number | null;
      profileImage?: string;
    },
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const allowedFields: Record<string, unknown> = {};
    if (data.name !== undefined)         allowedFields.name = data.name.trim();
    if (data.username !== undefined)     allowedFields.username = data.username.trim();
    if (data.email !== undefined)        allowedFields.email = data.email.toLowerCase().trim();
    if (data.contact !== undefined)      allowedFields.contact = data.contact;
    if (data.address !== undefined)      allowedFields.address = data.address;
    if (data.beneficiary !== undefined)  allowedFields.beneficiary = data.beneficiary;
    if (data.birthday !== undefined)     allowedFields.birthday = data.birthday;
    if (data.age !== undefined)          allowedFields.age = data.age;
    if (data.profileImage !== undefined) allowedFields.profileImage = data.profileImage;

    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: allowedFields },
      { returnDocument: 'after' },
    );

    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  // ✅ Change password (verifies current password first)
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const user = await this.userModel.findById(userId).select('+passwordHash');
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, (user as any).passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const rounds = 10;
    const newHash = await bcrypt.hash(newPassword, rounds);

    await this.userModel.updateOne({ _id: userId }, { $set: { passwordHash: newHash } });
  }
}