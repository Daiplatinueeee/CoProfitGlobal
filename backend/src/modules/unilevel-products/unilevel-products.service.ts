import {
  BadRequestException,
  Injectable,
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

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SubmitPurchaseDto } from './dto/submit-purchase.dto';
import { ApprovePurchaseDto } from './dto/approve-purchase.dto';
import { RedeemPinDto } from './dto/redeem-pin.dto';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { CreateLifestyleRewardDto } from '../admin/dto/create-lifestyle-reward.dto';

const PV_THRESHOLD = 1500;

@Injectable()
export class UnilevelProductsService implements OnModuleInit {
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
  ) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit() {
    const count = await this.productModel.countDocuments();
    if (count > 0) return;

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
    const [totalPv, availablePv] = await Promise.all([
      this.computeMonthPv(uid, mk),
      this.computeAvailablePv(uid),
    ]);

    return {
      monthKey:     mk,
      totalPv,
      availablePv,
      threshold:    PV_THRESHOLD,
      qualified:    totalPv >= PV_THRESHOLD,
    };
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
    const [purchaseResult, pinResult, spentResult] = await Promise.all([
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
    ]);

    const earned = (purchaseResult[0]?.total ?? 0) + (pinResult[0]?.total ?? 0);
    const spent  = spentResult[0]?.total ?? 0;
    return Math.max(0, earned - spent);
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

    return {
      message:     `PIN redeemed! You earned ${pinDoc.pv} PV from ${pinDoc.productName}.`,
      pin:         pinDoc.pin,
      productName: pinDoc.productName,
      pv:          pinDoc.pv,
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
    if (reward.stock <= 0) {
      throw new BadRequestException('This reward is out of stock');
    }

    const available = await this.computeAvailablePv(uid);
    if (available < reward.pointsCost) {
      throw new BadRequestException(
        `Insufficient PV. You need ${reward.pointsCost} PV but have ${available} PV available.`,
      );
    }

    await this.rewardModel.findByIdAndUpdate(reward._id, { $inc: { stock: -1 } });

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

  private generateCouponCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
