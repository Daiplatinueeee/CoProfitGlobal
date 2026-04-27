import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UnilevelPurchaseDocument = HydratedDocument<UnilevelPurchase>;

export enum PurchaseStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PurchasePaymentMethod {
  GCASH   = 'gcash',
  BANK    = 'bank',
  PAYMAYA = 'paymaya',
}

@Schema({ timestamps: true })
export class UnilevelPurchase {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UnilevelProduct', required: true })
  productId: Types.ObjectId;

  @Prop({ required: false })
  productName: string; // snapshot at time of purchase

  @Prop({ required: true })
  price: number; // PHP per unit (snapshot)

  @Prop({ required: true })
  pv: number; // PV per unit (snapshot)

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  totalPrice: number; // price * quantity

  @Prop({ required: true })
  totalPv: number; // pv * quantity — credited to user on approval

  @Prop({ required: true, index: true }) // YYYY-MM
  monthKey: string;

  @Prop({ type: String, enum: Object.values(PurchasePaymentMethod), required: true })
  paymentMethod: string;

  @Prop({ default: '' })
  proofImageUrl: string;

  @Prop({
    type: String,
    enum: Object.values(PurchaseStatus),
    default: PurchaseStatus.PENDING,
    index: true,
  })
  status: PurchaseStatus;

  @Prop({ default: '' })
  adminNote: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedByAdminId: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;
}

export const UnilevelPurchaseSchema = SchemaFactory.createForClass(UnilevelPurchase);

// Leadership query: sum approved PV for a user in a month
UnilevelPurchaseSchema.index({ userId: 1, monthKey: 1, status: 1 });
// Admin list: all by status + date
UnilevelPurchaseSchema.index({ status: 1, createdAt: -1 });
// User history
UnilevelPurchaseSchema.index({ userId: 1, createdAt: -1 });
