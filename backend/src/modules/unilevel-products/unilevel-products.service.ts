import {
  BadRequestException,
  Injectable,
  NotFoundException,
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

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SubmitPurchaseDto } from './dto/submit-purchase.dto';
import { ApprovePurchaseDto } from './dto/approve-purchase.dto';

const PV_THRESHOLD = 1500;

@Injectable()
export class UnilevelProductsService {
  constructor(
    @InjectModel(UnilevelProduct.name)
    private readonly productModel: Model<UnilevelProductDocument>,

    @InjectModel(UnilevelPurchase.name)
    private readonly purchaseModel: Model<UnilevelPurchaseDocument>,
  ) {}

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
    const totalPv = await this.computeMonthPv(uid, mk);

    return {
      monthKey:  mk,
      totalPv,
      threshold: PV_THRESHOLD,
      qualified: totalPv >= PV_THRESHOLD,
    };
  }

  /**
   * Called by LeadershipService to get approved product PV for a user+month.
   * This is the core method that powers the 1500 PV leadership qualification.
   */
  async computeMonthPv(userId: Types.ObjectId, monthKey: string): Promise<number> {
    const result = await this.purchaseModel.aggregate([
      { $match: { userId, monthKey, status: PurchaseStatus.APPROVED } },
      { $group: { _id: null, total: { $sum: '$totalPv' } } },
    ]);
    return result[0]?.total ?? 0;
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
}
