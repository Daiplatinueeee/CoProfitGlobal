import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  UnilevelProduct,
  UnilevelProductDocument,
  ProductStatus,
} from './schemas/unilevel-product.schema';
import {
  UnilevelPurchase,
  UnilevelPurchaseDocument,
  PurchaseStatus,
} from './schemas/unilevel-purchase.schema';
import {
  UnilevelPin,
  UnilevelPinDocument,
  UnilevelPinStatus,
} from './schemas/unilevel-pin.schema';
import {
  LifestyleReward,
  LifestyleRewardDocument,
  RewardStatus,
} from './schemas/lifestyle-reward.schema';
import {
  RewardRedemption,
  RewardRedemptionDocument,
} from './schemas/reward-redemption.schema';
import {
  UnilevelPvDeduction,
  UnilevelPvDeductionDocument,
} from './schemas/unilevel-pv-deduction.schema';
import {
  UnilevelPackageRequest,
  UnilevelPackageRequestDocument,
  PackageRequestStatus,
} from './schemas/unilevel-package-request.schema';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SubmitPurchaseDto } from './dto/submit-purchase.dto';
import { ApprovePurchaseDto } from './dto/approve-purchase.dto';
import { RedeemPinDto } from './dto/redeem-pin.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { CreateLifestyleRewardDto } from '../admin/dto/create-lifestyle-reward.dto';

import { User, UserDocument } from '../users/schemas/user.schema';
import { WalletService } from '../wallet/wallet.service';
import { WalletCurrency, WalletTxnSource } from '../wallet/schemas/wallet-transaction.schema';

const PV_THRESHOLD = 1500;

// Unilevel level-override rates on a PIN redemption's ₱ price — level 1 is the
// redeemer's direct sponsor (User.sponsorId), level 2 their sponsor's sponsor,
// etc. This walks the referral chain, not the binary placement tree, since
// "unilevel" here means sponsorship depth, separate from pairing/volume.
const UNILEVEL_LEVEL_RATES = [0.01, 0.02, 0.03, 0.04, 0.05];

@Injectable()
export class UnilevelProductsService implements OnModuleInit {
  private readonly logger = new Logger(UnilevelProductsService.name);

  constructor(
    @InjectModel(UnilevelProduct.name)
    private readonly productModel: Model<UnilevelProductDocument>,

    @InjectModel(UnilevelPurchase.name)
    private readonly purchaseModel: Model<UnilevelPurchaseDocument>,

    @InjectModel(UnilevelPin.name)
    private readonly pinModel: Model<UnilevelPinDocument>,

    @InjectModel(LifestyleReward.name)
    private readonly rewardModel: Model<LifestyleRewardDocument>,

    @InjectModel(RewardRedemption.name)
    private readonly redemptionModel: Model<RewardRedemptionDocument>,

    @InjectModel(UnilevelPvDeduction.name)
    private readonly pvDeductionModel: Model<UnilevelPvDeductionDocument>,

    @InjectModel(UnilevelPackageRequest.name)
    private readonly packageRequestModel: Model<UnilevelPackageRequestDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly walletService: WalletService,
  ) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit() {
    const count = await this.productModel.countDocuments();
    if (count === 0) {
      await this.productModel.insertMany([
        {
          name:        'Perfume',
          description: 'Premium fragrance blend',
          price:       1500,
          pv:          500,
          features:    ['Long-lasting scent', 'Premium ingredients'],
          sortOrder:   1,
          status:      ProductStatus.ACTIVE,
        },
        {
          name:        'Soap',
          description: 'Natural herbal cleansing bar',
          price:       500,
          pv:          150,
          features:    ['Natural ingredients', 'Gentle on skin'],
          sortOrder:   2,
          status:      ProductStatus.ACTIVE,
        },
        {
          name:        'Ointment Oil',
          description: 'Therapeutic essential oil blend',
          price:       800,
          pv:          250,
          features:    ['Pain relief', 'Aromatherapy grade'],
          sortOrder:   3,
          status:      ProductStatus.ACTIVE,
        },
      ]);
    }

    // Independent of the product-seed check above — a previous bug had this
    // nested inside the product early-return, so it silently never ran once
    // products were already seeded (which they always are on a live system).
    await this.seedLifestyleRewards();
  }

  /**
   * The LifestyleReward collection previously had no seed step at all (unlike
   * UnilevelProduct above), so it was genuinely empty in the database. The
   * frontend silently falls back to a local sample JSON whenever the API
   * returns zero rewards — that sample data uses placeholder ids ("lr-001"
   * etc.) that aren't real ObjectIds, so any redemption attempt against it
   * fails with "This reward is not yet available for redemption." Seeding
   * real documents here (same catalogue the frontend sample already shows)
   * gives every reward a genuine ObjectId so redemption actually works.
   */
  private async seedLifestyleRewards() {
    const count = await this.rewardModel.countDocuments();
    if (count > 0) return;

    await this.rewardModel.insertMany([
      { name: 'Eat All You Can',  description: 'Enjoy an unlimited eat-all-you-can dining experience at a partner restaurant.', pointsCost: 8,     category: 'Dining',      stock: 10, sortOrder: 1, status: RewardStatus.ACTIVE },
      { name: 'Staycation for 2', description: 'A relaxing overnight staycation for two at a partner hotel or resort.',         pointsCost: 25,    category: 'Travel',      stock: 10, sortOrder: 2, status: RewardStatus.ACTIVE },
      { name: 'Android Phone',    description: 'A brand-new Android smartphone. Exact model subject to availability.',         pointsCost: 60,    category: 'Electronics', stock: 10, sortOrder: 3, status: RewardStatus.ACTIVE },
      { name: 'Macbook',          description: 'A brand-new Apple MacBook laptop. Specs subject to availability.',             pointsCost: 250,   category: 'Electronics', stock: 5,  sortOrder: 4, status: RewardStatus.ACTIVE },
      { name: 'Motorcycle',       description: 'A brand-new motorcycle from our partner dealers.',                             pointsCost: 500,   category: 'Vehicle',     stock: 5,  sortOrder: 5, status: RewardStatus.ACTIVE },
      { name: 'Sedan Car',        description: 'A brand-new sedan from our partner dealerships.',                              pointsCost: 5000,  category: 'Vehicle',     stock: 3,  sortOrder: 6, status: RewardStatus.ACTIVE },
      { name: 'SUV Car',          description: 'A brand-new SUV from our partner dealerships.',                                pointsCost: 10000, category: 'Vehicle',     stock: 2,  sortOrder: 7, status: RewardStatus.ACTIVE },
      { name: 'House and Lot',    description: 'A house and lot property from our partner developers.',                        pointsCost: 25000, category: 'Real Estate', stock: 1,  sortOrder: 8, status: RewardStatus.ACTIVE },
    ]);

    this.logger.log('[unilevel-rewards] Seeded 8 default lifestyle rewards');
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  private currentMonthKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  // ─── Product CRUD (admin) ────────────────────────────────────────────────────

  async createProduct(dto: CreateProductDto) {
    const product = await this.productModel.create({
      name:        dto.name,
      description: dto.description ?? '',
      price:       dto.price,
      pv:          dto.pv,
      imageUrl:    dto.imageUrl ?? '',
      features:    dto.features ?? [],
      sortOrder:   dto.sortOrder ?? 0,
      status:      ProductStatus.ACTIVE,
    });
    return this.formatProduct(product.toObject());
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.productModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: dto },
      { new: true },
    ).lean();
    if (!product) throw new NotFoundException('Product not found');
    return this.formatProduct(product);
  }

  async listProducts(includeInactive = false) {
    const filter = includeInactive ? {} : { status: ProductStatus.ACTIVE };
    const rows = await this.productModel
      .find(filter)
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    return rows.map(this.formatProduct);
  }

  async getProduct(id: string) {
    const product = await this.productModel.findById(this.toObjectId(id)).lean();
    if (!product) throw new NotFoundException('Product not found');
    return this.formatProduct(product);
  }

  // ─── Purchase lifecycle ──────────────────────────────────────────────────────

  async submitPurchase(userId: string, dto: SubmitPurchaseDto) {
    const product = await this.productModel
      .findById(this.toObjectId(dto.productId))
      .lean();

    if (!product) throw new NotFoundException('Product not found');
    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is no longer available');
    }

    const purchase = await this.purchaseModel.create({
      userId:        this.toObjectId(userId),
      productId:     product._id,
      productName:   product.name,
      price:         product.price,
      pv:            product.pv,
      quantity:      dto.quantity,
      totalPrice:    product.price * dto.quantity,
      totalPv:       product.pv * dto.quantity,
      monthKey:      this.currentMonthKey(),
      paymentMethod: dto.paymentMethod,
      proofImageUrl: dto.proofImageUrl,
      status:        PurchaseStatus.PENDING,
    });

    return this.formatPurchase(purchase.toObject());
  }

  async getMyPurchases(userId: string, monthKey?: string) {
    const filter: Record<string, any> = { userId: this.toObjectId(userId) };
    if (monthKey) filter.monthKey = monthKey;

    const rows = await this.purchaseModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return rows.map(this.formatPurchase);
  }

  async getMyPvStatus(userId: string, monthKey?: string) {
    const mk = monthKey ?? this.currentMonthKey();
    const uid = this.toObjectId(userId);
    const [totalPv, availablePv, totalPrice] = await Promise.all([
      this.computeMonthPv(uid, mk),
      this.computeAvailablePv(uid),
      this.computeMonthPrice(uid, mk),
    ]);

    return {
      monthKey:     mk,
      totalPv,
      availablePv,
      totalPrice,
      threshold:    PV_THRESHOLD,
      qualified:    totalPv >= PV_THRESHOLD,
    };
  }

  /**
   * Monthly ₱ total for the "buy ≥₱1,500 by the 15th" access requirement.
   * Sums approved purchases' totalPrice + redeemed pins' price for the month.
   * Tracked separately from PV since price and PV are not 1:1 per product —
   * a ₱1,500 product can be worth anywhere from ~150 to ~500 PV depending on
   * the item, so PV alone can't stand in for the peso amount actually spent.
   */
  async computeMonthPrice(userId: Types.ObjectId, monthKey: string): Promise<number> {
    const [purchaseResult, pinResult] = await Promise.all([
      this.purchaseModel.aggregate([
        { $match: { userId, monthKey, status: PurchaseStatus.APPROVED } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      this.pinModel.aggregate([
        { $match: { usedByUserId: userId, monthKey, status: { $ne: UnilevelPinStatus.VOID } } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
    ]);
    return (purchaseResult[0]?.total ?? 0) + (pinResult[0]?.total ?? 0);
  }

  /**
   * Monthly PV for leadership qualification.
   * Sums approved purchase PV + redeemed pin PV for the given user+month.
   * Called by LeadershipService.
   */
  async computeMonthPv(userId: Types.ObjectId, monthKey: string): Promise<number> {
    const [purchaseResult, pinResult] = await Promise.all([
      this.purchaseModel.aggregate([
        { $match: { userId, monthKey, status: PurchaseStatus.APPROVED } },
        { $group: { _id: null, total: { $sum: '$totalPv' } } },
      ]),
      this.pinModel.aggregate([
        { $match: { usedByUserId: userId, monthKey, status: { $ne: UnilevelPinStatus.VOID } } },
        { $group: { _id: null, total: { $sum: '$pv' } } },
      ]),
    ]);
    return (purchaseResult[0]?.total ?? 0) + (pinResult[0]?.total ?? 0);
  }

  /**
   * Lifetime available PV balance = all earned PV (purchases + pins) minus PV spent on rewards.
   */
  async computeAvailablePv(userId: Types.ObjectId): Promise<number> {
    const [purchaseResult, pinResult, spentResult, deductionResult] = await Promise.all([
      this.purchaseModel.aggregate([
        { $match: { userId, status: PurchaseStatus.APPROVED } },
        { $group: { _id: null, total: { $sum: '$totalPv' } } },
      ]),
      this.pinModel.aggregate([
        { $match: { usedByUserId: userId, status: { $ne: UnilevelPinStatus.VOID } } },
        { $group: { _id: null, total: { $sum: '$pv' } } },
      ]),
      this.redemptionModel.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$pvCost' } } },
      ]),
      this.pvDeductionModel.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$pvConsumed' } } },
      ]),
    ]);

    const earned   = (purchaseResult[0]?.total ?? 0) + (pinResult[0]?.total ?? 0);
    const spent    = spentResult[0]?.total ?? 0;
    const deducted = deductionResult[0]?.total ?? 0;
    return Math.max(0, earned - spent - deducted);
  }

  /**
   * Consumes Available PV for a repeat binary pairing.
   * Creates a deduction record so computeAvailablePv reflects the new balance.
   * Throws if the user's current available PV is less than the requested amount.
   */
  async consumePvForRepeatBinary(userId: Types.ObjectId, pvAmount: number, refKey: string): Promise<void> {
    const available = await this.computeAvailablePv(userId);
    if (available < pvAmount) {
      throw new Error(`Insufficient Available PV: have ${available}, need ${pvAmount}`);
    }
    await this.pvDeductionModel.create({
      userId,
      pvConsumed: pvAmount,
      source:     'repeat_binary',
      refKey,
    });
  }

  // ─── Unilevel level-override bonuses ────────────────────────────────────────

  /**
   * Credits the 1%-5% level-override bonuses (levels 1-5) up the redeemer's
   * SPONSOR chain (User.sponsorId — who recruited them), not the binary
   * placement tree, after a PIN redemption.
   *
   * An upline only qualifies at their level if they have ever had an
   * APPROVED package request (i.e. their own Unilevel access is unlocked).
   * If not, that level is simply forfeited — NOT rolled up to the next
   * level — and the chain walk continues upward regardless.
   */
  private async awardUnilevelLevelBonuses(
    redeemerUserId: Types.ObjectId,
    price: number,
    refKeyBase: string,
  ): Promise<void> {
    if (price <= 0) return;

    let currentUserId: Types.ObjectId | null = redeemerUserId;

    for (let level = 1; level <= UNILEVEL_LEVEL_RATES.length; level++) {
      const current = await this.userModel
        .findById(currentUserId)
        .select('sponsorId')
        .lean();

      const sponsorId = (current as any)?.sponsorId as Types.ObjectId | null | undefined;
      if (!sponsorId) break; // chain ended — no more uplines

      const isUnlocked = await this.packageRequestModel.exists({
        userId: sponsorId,
        status: PackageRequestStatus.APPROVED,
      });

      if (isUnlocked) {
        const rate   = UNILEVEL_LEVEL_RATES[level - 1];
        const amount = Math.round(price * rate * 100) / 100;
        if (amount > 0) {
          await this.walletService.credit({
            userId:   sponsorId.toString(),
            currency: WalletCurrency.PHP,
            amount,
            source:   WalletTxnSource.UNILEVEL_LEVEL_BONUS,
            refKey:   `unilevel-level:${level}:${sponsorId.toString()}:${refKeyBase}`,
            note:     `Unilevel Level ${level} bonus (${rate * 100}%) — ₱${price} PIN redemption`,
            meta:     { level, rate, price, redeemerUserId: redeemerUserId.toString() },
          });
        }
      } else {
        this.logger.debug(
          `[unilevel-level] level ${level} skipped — sponsor=${sponsorId.toString()} has no unlocked Unilevel access`,
        );
      }

      currentUserId = sponsorId; // keep climbing regardless of this level's eligibility
    }
  }

  // ─── Product PIN redemption ──────────────────────────────────────────────────

  async redeemPin(userId: string, dto: RedeemPinDto) {
    const pin = dto.pin.trim().toUpperCase();
    const pinDoc = await this.pinModel.findOne({ pin });

    if (!pinDoc) {
      throw new NotFoundException('PIN not found. Please check the code and try again.');
    }
    if (pinDoc.status === UnilevelPinStatus.USED) {
      throw new BadRequestException('This PIN has already been redeemed.');
    }
    if (pinDoc.status === UnilevelPinStatus.VOID) {
      throw new BadRequestException('This PIN has been voided and cannot be redeemed.');
    }

    const now = new Date();
    pinDoc.status        = UnilevelPinStatus.USED;
    pinDoc.usedByUserId  = this.toObjectId(userId);
    pinDoc.usedAt        = now;
    pinDoc.monthKey      = this.currentMonthKey();
    await pinDoc.save();

    try {
      await this.awardUnilevelLevelBonuses(
        this.toObjectId(userId),
        pinDoc.price,
        `pin:${pinDoc._id.toString()}`,
      );
    } catch (err: any) {
      this.logger.error(`[unilevel-level] bonus award failed for pin ${pinDoc.pin}: ${err.message}`);
    }

    return {
      message:     `PIN redeemed! You earned ${pinDoc.pv} PV (₱${pinDoc.price}) from ${pinDoc.productName}.`,
      pin:         pinDoc.pin,
      productName: pinDoc.productName,
      pv:          pinDoc.pv,
      price:       pinDoc.price,
      redeemedAt:  now,
    };
  }

  async getMyPinHistory(userId: string) {
    const rows = await this.pinModel
      .find({ usedByUserId: this.toObjectId(userId) })
      .sort({ usedAt: -1 })
      .lean();

    return rows.map((p: any) => ({
      _id:         p._id?.toString(),
      pin:         p.pin,
      productId:   p.productId ? p.productId.toString() : null,
      productName: p.productName,
      pv:          p.pv,
      price:       p.price ?? 0,
      redeemedAt:  p.usedAt,
      status:      p.status === UnilevelPinStatus.VOID ? 'void' : 'active',
    }));
  }

  // ─── Lifestyle rewards ───────────────────────────────────────────────────────

  async listLifestyleRewards() {
    const rows = await this.rewardModel
      .find({ status: RewardStatus.ACTIVE })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    return rows.map(this.formatReward);
  }

  async redeemLifestyleReward(userId: string, dto: RedeemRewardDto) {
    const uid    = this.toObjectId(userId);
    const reward = await this.rewardModel.findById(this.toObjectId(dto.rewardId));

    if (!reward) throw new NotFoundException('Reward not found');
    if (reward.status !== RewardStatus.ACTIVE) {
      throw new BadRequestException('This reward is no longer available');
    }
    // Stock is unlimited by design — rewards are never blocked or decremented
    // by quantity, only by status (active/inactive) and the user's PV.

    const available = await this.computeAvailablePv(uid);
    if (available < reward.pointsCost) {
      throw new BadRequestException(
        `Insufficient PV. You need ${reward.pointsCost} PV but have ${available} PV available.`,
      );
    }

    const couponCode = this.generateCouponCode();
    const redemption = await this.redemptionModel.create({
      userId:     uid,
      rewardId:   reward._id,
      rewardName: reward.name,
      pvCost:     reward.pointsCost,
      couponCode,
      redeemedAt: new Date(),
    });

    const remainingPv = await this.computeAvailablePv(uid);

    return {
      message:     `Successfully redeemed "${reward.name}" for ${reward.pointsCost} PV.`,
      couponCode,
      reward:      this.formatReward(reward.toObject()),
      pvSpent:     reward.pointsCost,
      remainingPv,
    };
  }

  async getMyRewardRedemptionHistory(userId: string) {
    const uid = this.toObjectId(userId);
    const rows = await this.redemptionModel
      .find({ userId: uid })
      .sort({ redeemedAt: -1 })
      .lean();

    return rows.map((r: any) => ({
      _id:        r._id?.toString(),
      rewardName: r.rewardName,
      pvCost:     r.pvCost,
      couponCode: r.couponCode,
      redeemedAt: r.redeemedAt,
    }));
  }

  // ─── Admin: Lifestyle reward management ─────────────────────────────────────

  async createLifestyleReward(dto: CreateLifestyleRewardDto) {
    const reward = await this.rewardModel.create({
      name:        dto.name,
      description: dto.description ?? '',
      pointsCost:  dto.pointsCost,
      imageUrl:    dto.imageUrl ?? '',
      category:    dto.category ?? '',
      stock:       dto.stock,
      sortOrder:   dto.sortOrder ?? 0,
      status:      RewardStatus.ACTIVE,
    });
    return this.formatReward(reward.toObject());
  }

  async updateLifestyleReward(id: string, dto: Partial<CreateLifestyleRewardDto>) {
    const reward = await this.rewardModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: dto },
      { new: true },
    ).lean();
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

  // ─── Admin: purchase review ──────────────────────────────────────────────────

  async listPendingPurchases() {
    const rows = await this.purchaseModel
      .find({ status: PurchaseStatus.PENDING })
      .populate('userId', 'name username email')
      .sort({ createdAt: -1 })
      .lean();
    return rows.map(this.formatPurchase);
  }

  async listAllPurchases(status?: PurchaseStatus, userId?: string) {
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (userId) filter.userId = this.toObjectId(userId);

    const rows = await this.purchaseModel
      .find(filter)
      .populate('userId', 'name username email')
      .sort({ createdAt: -1 })
      .lean();
    return rows.map(this.formatPurchase);
  }

  async approvePurchase(purchaseId: string, adminId: string, dto: ApprovePurchaseDto) {
    const doc = await this.purchaseModel.findById(this.toObjectId(purchaseId));
    if (!doc) throw new NotFoundException('Purchase not found');
    if (doc.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException(`Purchase is already ${doc.status}`);
    }

    doc.status             = PurchaseStatus.APPROVED;
    doc.adminNote          = dto.adminNote ?? '';
    doc.reviewedByAdminId  = this.toObjectId(adminId);
    doc.reviewedAt         = new Date();
    await doc.save();

    return this.formatPurchase(doc.toObject());
  }

  async rejectPurchase(purchaseId: string, adminId: string, dto: ApprovePurchaseDto) {
    const doc = await this.purchaseModel.findById(this.toObjectId(purchaseId));
    if (!doc) throw new NotFoundException('Purchase not found');
    if (doc.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException(`Purchase is already ${doc.status}`);
    }

    doc.status             = PurchaseStatus.REJECTED;
    doc.adminNote          = dto.adminNote ?? '';
    doc.reviewedByAdminId  = this.toObjectId(adminId);
    doc.reviewedAt         = new Date();
    await doc.save();

    return this.formatPurchase(doc.toObject());
  }

  // ─── Package activation requests ────────────────────────────────────────────

  async submitPackageRequest(userId: string, paymentMethod: string, proofUrl: string) {
    const existing = await this.packageRequestModel.findOne({
      userId: this.toObjectId(userId),
      status: PackageRequestStatus.APPROVED,
    }).lean();
    if (existing) {
      throw new BadRequestException('You have already activated the Unilevel Package.');
    }

    const request = await this.packageRequestModel.create({
      userId:        this.toObjectId(userId),
      paymentMethod,
      amount:        1500,
      proofUrl:      proofUrl ?? '',
      status:        PackageRequestStatus.PENDING,
    });
    return this.formatPackageRequest(request.toObject());
  }

  async getMyPackageStatus(userId: string) {
    const uid = this.toObjectId(userId);

    const approved = await this.packageRequestModel
      .findOne({ userId: uid, status: PackageRequestStatus.APPROVED })
      .lean();
    if (approved) {
      return { status: 'approved', approvedAt: approved.approvedAt };
    }

    const pending = await this.packageRequestModel
      .findOne({ userId: uid, status: PackageRequestStatus.PENDING })
      .lean();
    if (pending) {
      return { status: 'pending' };
    }

    const rejected = await this.packageRequestModel
      .findOne({ userId: uid, status: PackageRequestStatus.REJECTED })
      .sort({ createdAt: -1 })
      .lean();
    if (rejected) {
      return { status: 'rejected' };
    }

    return { status: 'none' };
  }

  async listPackageRequests(status?: string) {
    const filter: Record<string, any> = {};
    if (status && status !== 'all') filter.status = status;

    const rows = await this.packageRequestModel
      .find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    return rows.map(this.formatPackageRequest);
  }

  async approvePackageRequest(id: string) {
    const doc = await this.packageRequestModel.findById(this.toObjectId(id));
    if (!doc) throw new NotFoundException('Package request not found');
    if (doc.status !== PackageRequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${doc.status}`);
    }
    const now = new Date();
    doc.status     = PackageRequestStatus.APPROVED;
    doc.reviewedAt = now;
    doc.approvedAt = now;
    await doc.save();
    return this.formatPackageRequest(doc.toObject());
  }

  async rejectPackageRequest(id: string, note: string) {
    const doc = await this.packageRequestModel.findById(this.toObjectId(id));
    if (!doc) throw new NotFoundException('Package request not found');
    if (doc.status !== PackageRequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${doc.status}`);
    }
    doc.status     = PackageRequestStatus.REJECTED;
    doc.reviewNote = note ?? '';
    doc.reviewedAt = new Date();
    await doc.save();
    return this.formatPackageRequest(doc.toObject());
  }

  // ─── Formatters ─────────────────────────────────────────────────────────────

  private formatProduct(doc: any) {
    return {
      _id:         doc._id?.toString(),
      name:        doc.name,
      description: doc.description ?? '',
      price:       doc.price,
      pv:          doc.pv,
      imageUrl:    doc.imageUrl ?? '',
      features:    doc.features ?? [],
      status:      doc.status,
      sortOrder:   doc.sortOrder ?? 0,
      createdAt:   doc.createdAt,
    };
  }

  private formatPurchase(doc: any) {
    return {
      _id:               doc._id?.toString(),
      userId:            doc.userId?.toString?.() ?? doc.userId,
      user:              doc.userId?.name ? {
        name:     doc.userId.name,
        username: doc.userId.username,
        email:    doc.userId.email,
      } : undefined,
      productId:         doc.productId?.toString?.() ?? doc.productId,
      productName:       doc.productName,
      price:             doc.price,
      pv:                doc.pv,
      quantity:          doc.quantity,
      totalPrice:        doc.totalPrice,
      totalPv:           doc.totalPv,
      monthKey:          doc.monthKey,
      paymentMethod:     doc.paymentMethod,
      proofImageUrl:     doc.proofImageUrl ?? '',
      status:            doc.status,
      adminNote:         doc.adminNote ?? '',
      reviewedByAdminId: doc.reviewedByAdminId?.toString?.() ?? null,
      reviewedAt:        doc.reviewedAt ?? null,
      createdAt:         doc.createdAt,
    };
  }

  private formatReward(doc: any) {
    return {
      _id:         doc._id?.toString(),
      name:        doc.name,
      description: doc.description ?? '',
      pointsCost:  doc.pointsCost,
      imageUrl:    doc.imageUrl ?? '',
      category:    doc.category ?? '',
      stock:       doc.stock,
      status:      doc.status,
      sortOrder:   doc.sortOrder ?? 0,
      createdAt:   doc.createdAt,
    };
  }

  private formatPackageRequest(doc: any) {
    const user = doc.userId;
    return {
      _id:           doc._id?.toString(),
      userId:        user?._id?.toString() ?? user?.toString(),
      userName:      user?.name ?? '',
      userEmail:     user?.email ?? '',
      paymentMethod: doc.paymentMethod,
      amount:        doc.amount,
      proofUrl:      doc.proofUrl ?? '',
      status:        doc.status,
      reviewNote:    doc.reviewNote ?? '',
      reviewedAt:    doc.reviewedAt ?? null,
      approvedAt:    doc.approvedAt ?? null,
      createdAt:     doc.createdAt,
    };
  }

  private generateCouponCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
