import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import {
  MembershipTier,
  SystemRole,
  User,
  UserDocument,
} from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import {
  ProductPin,
  ProductPinDocument,
  PinStatus,
} from '../product-pins/schema/product-pins.schema';
import {
  VolumeBucket,
  VolumeBucketDocument,
  VolumeLeg,
} from '../volume/schemas/volume-bucket.schema';
import {
  UnilevelPin,
  UnilevelPinDocument,
  UnilevelPinStatus,
} from '../unilevel-products/schemas/unilevel-pin.schema';
import {
  LifestyleReward,
  LifestyleRewardDocument,
  RewardStatus,
} from '../unilevel-products/schemas/lifestyle-reward.schema';
import {
  UnilevelProduct,
  UnilevelProductDocument,
} from '../unilevel-products/schemas/unilevel-product.schema';

import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateTierDto } from './dto/admin-update-tier.dto';
import { AdminGeneratePinsDto } from './dto/admin-generate-pins.dto';
import { AdminGenerateUnilevelPinDto } from './dto/admin-generate-unilevel-pin.dto';
import { GenerateProductPinDto } from './dto/generate-product-pin.dto';
import { CreateLifestyleRewardDto } from './dto/create-lifestyle-reward.dto';
import { PairingService } from '../pairing/pairing.service';
import {
  ForgotPasswordRequest,
  ForgotPasswordRequestDocument,
  ForgotPasswordRequestStatus,
} from '../auth/schemas/forgot-password-request.schema';
import {
  WalletTransaction,
  WalletTransactionDocument,
  WalletCurrency,
  WalletTxnType,
  WalletTxnSource,
} from '../wallet/schemas/wallet-transaction.schema';

import { AdminRestrictUserDto } from './dto/admin-restrict-user.dto';
import { WalletService } from '../wallet/wallet.service';
import { VolumeService } from '../volume/volume.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(ProductPin.name)
    private readonly pinModel: Model<ProductPinDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(VolumeBucket.name)
    private readonly volumeBucketModel: Model<VolumeBucketDocument>,
    @InjectModel(UnilevelPin.name)
    private readonly unilevelPinModel: Model<UnilevelPinDocument>,
    @InjectModel(LifestyleReward.name)
    private readonly rewardModel: Model<LifestyleRewardDocument>,
    @InjectModel(UnilevelProduct.name)
    private readonly unilevelProductModel: Model<UnilevelProductDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly txnModel: Model<WalletTransactionDocument>,
@InjectModel(ForgotPasswordRequest.name)
    private readonly forgotPasswordRequestModel: Model<ForgotPasswordRequestDocument>,
    private readonly usersService: UsersService,
    private readonly pairingService: PairingService,
    private readonly walletService: WalletService,
    private readonly volumeService: VolumeService,
  ) {}

  private isValidObjectId(id: string) {
    return Types.ObjectId.isValid(id);
  }

  // The free static PIN is shared across all free accounts — it lives only in
  // memory (never in the DB) so the normal lookup is skipped for this value.
  private static readonly FREE_STATIC_PIN = 'AB1234';

  async createUser(dto: AdminCreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const isLegacyFreePin = dto.packagePin === AdminService.FREE_STATIC_PIN;
    let membershipTier: MembershipTier;
    let pinDoc: ProductPinDocument | null = null;
    let isFreeAccount = false;

    if (isLegacyFreePin) {
      // ── Legacy free-account path: static PIN, no DB lookup, no consumption ─
      membershipTier = MembershipTier.FREE;
      isFreeAccount = true;
    } else {
      // ── Step 1: Validate the PIN exists and is UNUSED ──────────────────────
      pinDoc = await this.pinModel.findOne({ pin: dto.packagePin });

      if (!pinDoc) {
        throw new BadRequestException(
          'Invalid package PIN — PIN does not exist',
        );
      }
      if (pinDoc.status !== PinStatus.UNUSED) {
        throw new BadRequestException(
          `PIN is already ${pinDoc.status.toLowerCase()} and cannot be used`,
        );
      }

      // ── Step 2: Derive membershipTier and free flag from the PIN ───────────
      membershipTier = pinDoc.tier;
      isFreeAccount = pinDoc.isFree ?? false;
    }

    // ── Step 3: Create the user ────────────────────────────────────────────
    const created = await this.usersService.createUser({
      name: dto.name,
      username: dto.username,
      email: dto.email,
      passwordHash,
      role: dto.role ?? SystemRole.USER,
      membershipTier,
      sponsorReferralCode: dto.sponsorReferralCode,
      packagePin: dto.packagePin,
      age: dto.age,
      contact: dto.contact,
      address: dto.address,
      beneficiary: dto.beneficiary,
      birthday: dto.birthday,
    });

    console.log('User created successfully:', (created as any)._id.toString());

    // Set isFree flag on the user when the PIN is a free PIN
    if (isFreeAccount) {
      await this.userModel.updateOne(
        { _id: (created as any)._id },
        { $set: { isFree: true } },
      );
    }

    if (!isLegacyFreePin && pinDoc) {
      console.log('Now marking PIN as USED...');

      // ── Step 4: Mark PIN as USED — rollback user if this fails ─────────────
      try {
        const updateResult = await this.pinModel.updateOne(
          { _id: pinDoc._id },
          {
            $set: {
              status: PinStatus.USED,
              usedByUserId: (created as any)._id,
              usedAt: new Date(),
            },
          },
        );

        if (updateResult.matchedCount === 0) {
          throw new Error('PIN document not found during update');
        }

        console.log('PIN marked as USED successfully:', dto.packagePin);
      } catch (err: any) {
        // Rollback: delete the user we just created so data stays consistent
        console.error(
          'Failed to mark PIN as USED — rolling back user creation:',
          err.message,
        );
        await this.userModel.deleteOne({ _id: (created as any)._id });
        throw new BadRequestException(
          'Failed to mark PIN as used — user creation has been rolled back. Please try again.',
        );
      }
    }

    return {
      user: {
        id: (created as any)._id.toString(),
        name: created.name,
        username: created.username,
        email: created.email,
        role: created.role,
        membershipTier: created.membershipTier,
        referralCode: created.referralCode,
        packagePin: dto.packagePin,
        createdAt: (created as any).createdAt,
      },
    };
  }

  async findAllUsers() {
    const users = await this.userModel
      .find()
      .select(
        '_id name username email role membershipTier isFree referralCode sponsorId packagePin ' +
        'leftLegPoints rightLegPoints age contact address beneficiary birthday profileImage ' +
        'isActive isRestricted restrictedReason createdAt updatedAt ' +
        'totalPairingBonus totalSign5Bonus totalLeadershipBonus ' +
        'totalDirectReferralIncome totalIndirectReferralIncome ' +
        'totalRepeatBinaryBonusIncome totalStairstepBonusIncome ' +
        'totalRoyaltyBonusIncome unilevelPoints',
      )
      .sort({ createdAt: -1 })
      .lean();

    // Batch-fetch all VolumeBucket records for these users (single query, not N+1)
    const userIds = users.map((u: any) => u._id);
    const buckets = await this.volumeBucketModel
      .find({ ownerUserId: { $in: userIds } })
      .select('ownerUserId leg availablePoints')
      .lean();

    const bucketMap = new Map<string, { left: number; right: number }>();
    for (const b of buckets as any[]) {
      const key = b.ownerUserId.toString();
      if (!bucketMap.has(key)) bucketMap.set(key, { left: 0, right: 0 });
      if (b.leg === VolumeLeg.LEFT)
        bucketMap.get(key)!.left = b.availablePoints ?? 0;
      if (b.leg === VolumeLeg.RIGHT)
        bucketMap.get(key)!.right = b.availablePoints ?? 0;
    }

    return users.map((user: any) => {
      const avail = bucketMap.get(user._id.toString()) ?? { left: 0, right: 0 };
      return {
        id: user._id.toString(),
        name: user.name ?? '',
        username: user.username ?? '',
        email: user.email,
        role: user.role,
        membershipTier: user.membershipTier,
        isFree: (user as any).isFree ?? false,
        referralCode: user.referralCode ?? null,
        sponsorId: user.sponsorId ? user.sponsorId.toString() : null,
        packagePin: user.packagePin ?? null,
        leftLegPoints: user.leftLegPoints ?? 0,
        rightLegPoints: user.rightLegPoints ?? 0,
        leftAvailablePoints: avail.left,
        rightAvailablePoints: avail.right,
        age: user.age ?? null,
        contact: user.contact ?? '',
        address: user.address ?? '',
        beneficiary: user.beneficiary ?? '',
        birthday: user.birthday ?? '',
        profileImage: user.profileImage ?? '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        isRestricted: user.isRestricted ?? false,
        restrictedReason: user.restrictedReason ?? '',
        // ── Bonus & income fields ─────────────────────────────────────────
        totalPairingBonus: user.totalPairingBonus ?? 0,
        totalSign5Bonus: user.totalSign5Bonus ?? 0,
        totalLeadershipBonus: user.totalLeadershipBonus ?? 0,
        totalDirectReferralIncome: user.totalDirectReferralIncome ?? 0,
        totalIndirectReferralIncome: user.totalIndirectReferralIncome ?? 0,
        totalRepeatBinaryBonusIncome: user.totalRepeatBinaryBonusIncome ?? 0,
        totalStairstepBonusIncome: user.totalStairstepBonusIncome ?? 0,
        totalRoyaltyBonusIncome: user.totalRoyaltyBonusIncome ?? 0,
        unilevelPoints: user.unilevelPoints ?? 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });
  }

  async upgradePackage(userId: string, packagePin: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const uid = new Types.ObjectId(userId);

    // ── 1. Find the user ──────────────────────────────────────────────────────
    const user = await this.userModel
      .findById(uid)
      .select('_id name username email membershipTier packagePin')
      .lean();

    if (!user) throw new NotFoundException('User not found');

    // ── 2. Look up the PIN ────────────────────────────────────────────────────
    const pinDoc = await this.pinModel.findOne({ pin: packagePin });

    if (!pinDoc) {
      throw new BadRequestException('Invalid package PIN — PIN does not exist');
    }

    if (pinDoc.status !== PinStatus.UNUSED) {
      throw new BadRequestException(
        `PIN is already ${pinDoc.status.toLowerCase()} and cannot be used`,
      );
    }

    const newTier: MembershipTier = pinDoc.tier;
    const newIsFree: boolean = pinDoc.isFree ?? false;

    // ── 3. Update the user's membership tier ─────────────────────────────────
    await this.userModel.updateOne(
      { _id: uid },
      {
        $set: {
          membershipTier: newTier,
          packagePin,
          tierUpgradedAt: new Date(),
          isFree: newIsFree,
        },
      },
    );

    // ── 4. Mark the PIN as USED ───────────────────────────────────────────────
    await this.pinModel.updateOne(
      { _id: pinDoc._id },
      {
        $set: {
          status: PinStatus.USED,
          usedByUserId: uid,
          usedAt: new Date(),
        },
      },
    );

    const previousTier = (user as any).membershipTier as MembershipTier;
    await this.txnModel
      .create({
        userId: uid,
        currency: WalletCurrency.PHP,
        type: WalletTxnType.CREDIT,
        amount: 0.01,
        source: WalletTxnSource.TIER_UPGRADE,
        refKey: `tier_upgrade:${uid.toString()}:${packagePin}`,
        note: `Package upgraded from ${previousTier} → ${newTier} using PIN ${packagePin}`,
        meta: { previousTier, newTier, pin: packagePin },
        postedAt: new Date(),
      })
      .catch(() => {});

    // Push the tier's point delta up to ancestors and attempt pairing —
    // previously missing here, so admin-upgrading an already-placed
    // member's package never generated volume or triggered a pairing check.
    await this.volumeService.awardUpgradeVolume(uid.toString(), previousTier, newTier);

    return {
      id: (user as any)._id.toString(),
      name: (user as any).name,
      username: (user as any).username,
      email: (user as any).email,
      previousTier,
      newTier,
      packagePin,
    };
  }

  async updateMembershipTier(userId: string, dto: AdminUpdateTierDto) {
    return this.usersService.updateMembershipTier(userId, dto.membershipTier);
  }

  async getAvailablePoints(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId');
    }
    const uid = new Types.ObjectId(userId);
    const [left, right] = await Promise.all([
      this.volumeBucketModel
        .findOne({ ownerUserId: uid, leg: VolumeLeg.LEFT })
        .lean(),
      this.volumeBucketModel
        .findOne({ ownerUserId: uid, leg: VolumeLeg.RIGHT })
        .lean(),
    ]);
    return {
      leftAvailablePoints: (left as any)?.availablePoints ?? 0,
      rightAvailablePoints: (right as any)?.availablePoints ?? 0,
    };
  }

  async updateLegPoints(
    userId: string,
    dto: { leftAvailablePoints?: number; rightAvailablePoints?: number },
  ) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    if (
      dto.leftAvailablePoints === undefined &&
      dto.rightAvailablePoints === undefined
    ) {
      throw new BadRequestException('No fields provided to update');
    }

    const uid = new Types.ObjectId(userId);

    const user = await this.userModel
      .findById(uid)
      .select('_id name username')
      .lean();
    if (!user) throw new NotFoundException('User not found');

    const upserts: Promise<any>[] = [];

    if (dto.leftAvailablePoints !== undefined) {
      upserts.push(
        this.volumeBucketModel
          .findOneAndUpdate(
            { ownerUserId: uid, leg: VolumeLeg.LEFT },
            { $set: { availablePoints: dto.leftAvailablePoints } },
            { upsert: true, returnDocument: 'after' },
          )
          .lean(),
      );
    }

    if (dto.rightAvailablePoints !== undefined) {
      upserts.push(
        this.volumeBucketModel
          .findOneAndUpdate(
            { ownerUserId: uid, leg: VolumeLeg.RIGHT },
            { $set: { availablePoints: dto.rightAvailablePoints } },
            { upsert: true, returnDocument: 'after' },
          )
          .lean(),
      );
    }

    await Promise.all(upserts);

    // Trigger pairing now that available points have been updated
    await this.pairingService.tryPairIfPossible(userId);
    await this.pairingService.tryRepeatBinaryIfPossible(userId);

    const updated = await this.getAvailablePoints(userId);

    return {
      id: (user as any)._id.toString(),
      name: (user as any).name,
      username: (user as any).username,
      ...updated,
    };
  }

  // ── Update bonuses & income fields ────────────────────────────────────────

  async updateBonuses(
    userId: string,
    dto: {
      totalPairingBonus?: number;
      totalSign5Bonus?: number;
      totalLeadershipBonus?: number;
      totalDirectReferralIncome?: number;
      totalIndirectReferralIncome?: number;
      totalRepeatBinaryBonusIncome?: number;
      totalStairstepBonusIncome?: number;
      totalRoyaltyBonusIncome?: number;
      unilevelPoints?: number;
    },
  ) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const bonusFields = [
      'totalPairingBonus',
      'totalSign5Bonus',
      'totalLeadershipBonus',
      'totalDirectReferralIncome',
      'totalIndirectReferralIncome',
      'totalRepeatBinaryBonusIncome',
      'totalStairstepBonusIncome',
      'totalRoyaltyBonusIncome',
    ] as const;

    const current = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select(bonusFields.join(' '))
      .lean();

    if (!current) throw new NotFoundException('User not found');

    const allowedFields: Record<string, number> = {};

    if (dto.totalPairingBonus !== undefined)
      allowedFields.totalPairingBonus = dto.totalPairingBonus;
    if (dto.totalSign5Bonus !== undefined)
      allowedFields.totalSign5Bonus = dto.totalSign5Bonus;
    if (dto.totalLeadershipBonus !== undefined)
      allowedFields.totalLeadershipBonus = dto.totalLeadershipBonus;
    if (dto.totalDirectReferralIncome !== undefined)
      allowedFields.totalDirectReferralIncome = dto.totalDirectReferralIncome;
    if (dto.totalIndirectReferralIncome !== undefined)
      allowedFields.totalIndirectReferralIncome = dto.totalIndirectReferralIncome;
    if (dto.totalRepeatBinaryBonusIncome !== undefined)
      allowedFields.totalRepeatBinaryBonusIncome = dto.totalRepeatBinaryBonusIncome;
    if (dto.totalStairstepBonusIncome !== undefined)
      allowedFields.totalStairstepBonusIncome = dto.totalStairstepBonusIncome;
    if (dto.totalRoyaltyBonusIncome !== undefined)
      allowedFields.totalRoyaltyBonusIncome = dto.totalRoyaltyBonusIncome;
    if (dto.unilevelPoints !== undefined)
      allowedFields.unilevelPoints = dto.unilevelPoints;

    if (Object.keys(allowedFields).length === 0) {
      throw new BadRequestException('No bonus fields provided to update');
    }

    const updated = await this.userModel.findByIdAndUpdate(
      new Types.ObjectId(userId),
      { $set: allowedFields },
      { returnDocument: 'after' },
    );

    if (!updated) throw new NotFoundException('User not found');

    // Compute the net PHP delta across all changed bonus fields so that
    // today / thisWeek / thisMonth aggregations reflect the adjustment.
    const u = current as any;
    let phpDelta = 0;
    for (const field of bonusFields) {
      if (allowedFields[field] !== undefined) {
        phpDelta += allowedFields[field] - (u[field] ?? 0);
      }
    }

    const refKey = `admin_adjustment:${userId}:${Date.now()}`;
    if (phpDelta > 0) {
      await this.walletService.credit({
        userId,
        currency: WalletCurrency.PHP,
        amount: phpDelta,
        source: WalletTxnSource.ADMIN_ADJUSTMENT,
        refKey,
        note: 'Admin bonus adjustment',
      });
    } else if (phpDelta < 0) {
      await this.walletService.debit({
        userId,
        currency: WalletCurrency.PHP,
        amount: Math.abs(phpDelta),
        source: WalletTxnSource.ADMIN_ADJUSTMENT,
        refKey,
        note: 'Admin bonus adjustment',
      });
    }

    return {
      id: (updated as any)._id.toString(),
      ...allowedFields,
    };
  }

  // Reserved static PINs that must never be randomly generated
  private static readonly RESERVED_PINS = new Set(['AB1234']);

  // Normal PINs: first letter is never 'F' so admin can identify free PINs by their prefix
  private generatePinRaw(): string {
    const firstLetters = 'ABCDEGHIJKLMNOPQRSTUVWXYZ'; // 'F' excluded
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let pin: string;
    do {
      const l1 = firstLetters[Math.floor(Math.random() * firstLetters.length)];
      const l2 = letters[Math.floor(Math.random() * 26)];
      const digits = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      pin = `${l1}${l2}${digits}`;
    } while (AdminService.RESERVED_PINS.has(pin));
    return pin;
  }

  // Free PINs always start with 'F' so admin can visually identify them
  private generateFreePinRaw(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const l2 = letters[Math.floor(Math.random() * 26)];
    const digits = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `F${l2}${digits}`;
  }

  private generateProductPinRaw(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const l1 = letters[Math.floor(Math.random() * 26)];
    const l2 = letters[Math.floor(Math.random() * 26)];
    const l3 = letters[Math.floor(Math.random() * 26)];
    const digits = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${l1}${l2}${l3}${digits}`;
  }

  // ─── Package PINs (membership tier activation) ───────────────────────────────

  async generatePins(adminId: string, dto: AdminGeneratePinsDto) {
    if (!this.isValidObjectId(adminId)) {
      throw new BadRequestException('Invalid adminId');
    }

    const adminObjId = new Types.ObjectId(adminId);
    const pins: string[] = [];

    const isFreePin = dto.isFree === true;

    for (let i = 0; i < dto.quantity; i++) {
      let inserted = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        const pin = isFreePin
          ? this.generateFreePinRaw()
          : this.generatePinRaw();

        try {
          const doc = new this.pinModel({
            pin,
            tier: dto.tier,
            status: PinStatus.UNUSED,
            createdByAdminId: adminObjId,
            usedByUserId: null,
            usedAt: null,
            isFree: isFreePin,
          });

          await doc.save();

          pins.push(pin);
          inserted = true;
          break;
        } catch (e: any) {
          if (e?.code === 11000) {
            if (e?.keyPattern?.pin) {
              console.warn(`PIN "${pin}" already exists, retrying...`);
              continue;
            }
            console.error('Unexpected duplicate key on field:', {
              keyPattern: e?.keyPattern,
              keyValue: e?.keyValue,
            });
            throw new BadRequestException(
              `Duplicate key error on field: ${JSON.stringify(e?.keyPattern)}`,
            );
          }

          console.error('PIN save failed:', {
            message: e?.message,
            code: e?.code,
            name: e?.name,
          });

          throw new BadRequestException(e?.message ?? 'Failed to save PIN');
        }
      }

      if (!inserted) {
        throw new BadRequestException(
          'Could not generate a unique PIN after 10 attempts',
        );
      }
    }

    return {
      tier: dto.tier,
      quantity: dto.quantity,
      isFree: isFreePin,
      pins,
    };
  }

  async listPins(tier?: MembershipTier, status?: PinStatus, limit = 50) {
    const q: any = {};
    if (tier) q.tier = tier;
    if (status) q.status = status;

    const rows = await this.pinModel
      .find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .select(
        'pin tier status isFree usedByUserId usedAt createdByAdminId createdAt',
      )
      .lean();

    return rows.map((r: any) => ({
      id: r._id.toString(),
      pin: r.pin ?? null,
      tier: r.tier,
      status: r.status,
      isFree: r.isFree ?? false,
      usedByUserId: r.usedByUserId ? r.usedByUserId.toString() : null,
      usedAt: r.usedAt ?? null,
      createdByAdminId: r.createdByAdminId
        ? r.createdByAdminId.toString()
        : null,
      createdAt: r.createdAt,
    }));
  }

  async voidPin(pinId: string) {
    if (!this.isValidObjectId(pinId)) {
      throw new BadRequestException('Invalid pinId');
    }

    const pin = await this.pinModel.findById(pinId);
    if (!pin) {
      throw new NotFoundException('Pin not found');
    }

    if (pin.status === PinStatus.USED) {
      throw new BadRequestException('Cannot void a USED pin');
    }

    await this.pinModel.updateOne(
      { _id: pin._id },
      { $set: { status: PinStatus.VOID, updatedAt: new Date() } },
    );

    return {
      id: pin._id.toString(),
      status: PinStatus.VOID,
    };
  }

  // ─── Unilevel PINs (product redemption) ──────────────────────────────────────

  async generateUnilevelPins(
    adminId: string,
    dto: AdminGenerateUnilevelPinDto,
  ) {
    if (!this.isValidObjectId(adminId)) {
      throw new BadRequestException('Invalid adminId');
    }
    if (!this.isValidObjectId(dto.productId)) {
      throw new BadRequestException('Invalid productId');
    }

    const product = await this.unilevelProductModel
      .findById(dto.productId)
      .lean();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const adminObjId = new Types.ObjectId(adminId);
    const productObjId = new Types.ObjectId(dto.productId);
    const pins: string[] = [];

    for (let i = 0; i < dto.quantity; i++) {
      let inserted = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        const pin = this.generateProductPinRaw();

        try {
          const doc = new this.unilevelPinModel({
            pin,
            productId: productObjId,
            productName: product.name,
            pv: product.pv,
            note: dto.note ?? '',
            status: UnilevelPinStatus.UNUSED,
            createdByAdminId: adminObjId,
          });

          await doc.save();
          pins.push(pin);
          inserted = true;
          break;
        } catch (e: any) {
          if (e?.code === 11000 && e?.keyPattern?.pin) {
            console.warn(`Unilevel PIN "${pin}" already exists, retrying...`);
            continue;
          }
          throw new BadRequestException(
            e?.message ?? 'Failed to save unilevel PIN',
          );
        }
      }

      if (!inserted) {
        throw new BadRequestException(
          'Could not generate a unique unilevel PIN after 10 attempts',
        );
      }
    }

    return {
      pv: product.pv,
      productName: product.name,
      quantity: dto.quantity,
      pins,
    };
  }

  async generateProductPins(adminId: string, dto: GenerateProductPinDto) {
    if (!this.isValidObjectId(adminId)) {
      throw new BadRequestException('Invalid adminId');
    }

    const adminObjId = new Types.ObjectId(adminId);
    const pins: string[] = [];

    for (let i = 0; i < dto.quantity; i++) {
      let inserted = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        const pin = this.generateProductPinRaw();

        try {
          const doc = new this.unilevelPinModel({
            pin,
            productId: null,
            productName: '',
            pv: dto.pv,
            note: dto.note ?? '',
            status: UnilevelPinStatus.UNUSED,
            createdByAdminId: adminObjId,
          });

          await doc.save();
          pins.push(pin);
          inserted = true;
          break;
        } catch (e: any) {
          if (e?.code === 11000 && e?.keyPattern?.pin) {
            console.warn(`Product PIN "${pin}" already exists, retrying...`);
            continue;
          }
          throw new BadRequestException(
            e?.message ?? 'Failed to save product PIN',
          );
        }
      }

      if (!inserted) {
        throw new BadRequestException(
          'Could not generate a unique product PIN after 10 attempts',
        );
      }
    }

    return { pv: dto.pv, quantity: dto.quantity, pins };
  }

  async listUnilevelPins(status?: UnilevelPinStatus, limit = 50) {
    const q: any = {};
    if (status) q.status = status;

    const rows = await this.unilevelPinModel
      .find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean();

    return rows.map((r: any) => ({
      id: r._id.toString(),
      pin: r.pin,
      productId: r.productId ? r.productId.toString() : null,
      productName: r.productName ?? null,
      pv: r.pv,
      status: r.status,
      createdAt: r.createdAt,
      usedAt: r.usedAt ?? null,
      usedByUserId: r.usedByUserId ? r.usedByUserId.toString() : null,
    }));
  }

  async deleteUnilevelPin(pinId: string) {
    if (!this.isValidObjectId(pinId)) {
      throw new BadRequestException('Invalid pinId');
    }

    const pin = await this.unilevelPinModel.findById(pinId);
    if (!pin) throw new NotFoundException('Unilevel PIN not found');
    if (pin.status === UnilevelPinStatus.USED) {
      throw new BadRequestException('Cannot delete a USED unilevel PIN');
    }

    await this.unilevelPinModel.deleteOne({ _id: pin._id });

    return { id: pin._id.toString(), deleted: true };
  }

  async deletePackagePin(pinId: string) {
    if (!this.isValidObjectId(pinId)) {
      throw new BadRequestException('Invalid pinId');
    }

    const pin = await this.pinModel.findById(pinId);
    if (!pin) throw new NotFoundException('Package PIN not found');

    await this.pinModel.deleteOne({ _id: pin._id });

    return { id: pin._id.toString(), deleted: true };
  }

  // ─── Bulk delete package PINs by status ──────────────────────────────────────

  async bulkDeletePackagePins(status: 'UNUSED' | 'USED') {
    const result = await this.pinModel.deleteMany({ status });
    return { deleted: result.deletedCount, status };
  }

  // ─── Bulk delete product (unilevel) PINs by status ───────────────────────────

  async bulkDeleteProductPins(status: 'UNUSED' | 'USED') {
    const result = await this.unilevelPinModel.deleteMany({ status });
    return { deleted: result.deletedCount, status };
  }

  // ─── Lifestyle reward management ─────────────────────────────────────────────

  async createLifestyleReward(dto: CreateLifestyleRewardDto) {
    const reward = await this.rewardModel.create({
      name: dto.name,
      description: dto.description ?? '',
      pointsCost: dto.pointsCost,
      imageUrl: dto.imageUrl ?? '',
      category: dto.category ?? '',
      stock: dto.stock,
      sortOrder: dto.sortOrder ?? 0,
      status: RewardStatus.ACTIVE,
    });
    return this.formatReward(reward.toObject());
  }

  async updateLifestyleReward(
    id: string,
    dto: Partial<CreateLifestyleRewardDto>,
  ) {
    if (!this.isValidObjectId(id))
      throw new BadRequestException('Invalid reward id');
    const reward = await this.rewardModel
      .findByIdAndUpdate(new Types.ObjectId(id), { $set: dto }, { new: true })
      .lean();
    if (!reward) throw new NotFoundException('Reward not found');
    return this.formatReward(reward);
  }

  async listAllLifestyleRewards() {
    const rows = await this.rewardModel
      .find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    return rows.map(this.formatReward);
  }

  private formatReward(doc: any) {
    return {
      _id: doc._id?.toString(),
      name: doc.name,
      description: doc.description ?? '',
      pointsCost: doc.pointsCost,
      imageUrl: doc.imageUrl ?? '',
      category: doc.category ?? '',
      stock: doc.stock,
      status: doc.status,
      sortOrder: doc.sortOrder ?? 0,
      createdAt: doc.createdAt,
    };
  }

  // ── Forgot-password requests ────────────────────────────────────────────────

  async listForgotPasswordRequests(status?: string) {
    const filter: Record<string, any> = {};
    if (status === 'pending' || status === 'resolved') filter.status = status;
    const rows = await this.forgotPasswordRequestModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return rows.map((r: any) => ({
      id: r._id?.toString(),
      reason: r.reason,
      description: r.description,
      status: r.status,
      resolvedAt: r.resolvedAt ?? null,
      resolvedNote: r.resolvedNote ?? null,
      createdAt: r.createdAt,
    }));
  }

  async resolveForgotPasswordRequest(id: string, note?: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
    const doc = await this.forgotPasswordRequestModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: ForgotPasswordRequestStatus.RESOLVED,
            resolvedAt: new Date(),
            ...(note ? { resolvedNote: note } : {}),
          },
        },
        { new: true },
      )
      .lean();
    if (!doc) throw new NotFoundException('Request not found');
    return { message: 'Marked as resolved', id };
  }

  // ── Admin password override ─────────────────────────────────────────────────

  async changeUserPassword(userId: string, newPassword: string) {
    if (!this.isValidObjectId(userId))
      throw new BadRequestException('Invalid userId');
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $set: { passwordHash } },
    );
    if (result.matchedCount === 0)
      throw new NotFoundException('User not found');
    return { message: 'Password updated successfully' };
  }

  // ── Delete user ─────────────────────────────────────────────────────────────

  async deleteUser(userId: string) {
    if (!this.isValidObjectId(userId))
      throw new BadRequestException('Invalid userId');

    const result = await this.userModel.deleteOne({
      _id: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0)
      throw new NotFoundException('User not found');

    return { id: userId, deleted: true };
  }

  // ── Restrict Account ─────────────────────────────────────────────────────────

  async restrictUser(
    userId: string,
    dto: AdminRestrictUserDto,
  ): Promise<{ userId: string; isRestricted: boolean; reason: string }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const update: Record<string, unknown> = {
      isRestricted: dto.isRestricted,
      restrictedReason: dto.isRestricted ? (dto.reason?.trim() ?? '') : '',
      restrictedAt: dto.isRestricted ? new Date() : null,
    };

    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: update },
      { returnDocument: 'after' },
    );

    if (!updated) throw new NotFoundException('User not found');

    // Revoke all active refresh sessions so they're logged out immediately
    if (dto.isRestricted) {
      await this.userModel.updateOne(
        { _id: userId },
        { $set: { refreshSessions: [] } },
      );
    }

    return {
      userId,
      isRestricted: (updated as any).isRestricted,
      reason: (updated as any).restrictedReason ?? '',
    };
  }
}