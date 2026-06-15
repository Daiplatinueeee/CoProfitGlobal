import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UnilevelPackageRequestDocument = HydratedDocument<UnilevelPackageRequest>;

export enum PackageRequestStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class UnilevelPackageRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ['gcash', 'paymaya', 'cash'], required: true })
  paymentMethod: string;

  @Prop({ required: true, default: 1500 })
  amount: number;

  @Prop({ default: '' })
  proofUrl: string;

  @Prop({
    type: String,
    enum: Object.values(PackageRequestStatus),
    default: PackageRequestStatus.PENDING,
    index: true,
  })
  status: PackageRequestStatus;

  @Prop({ default: '' })
  reviewNote: string;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;

  @Prop({ type: Date, default: null })
  approvedAt: Date | null;
}

export const UnilevelPackageRequestSchema = SchemaFactory.createForClass(UnilevelPackageRequest);

UnilevelPackageRequestSchema.index({ userId: 1, status: 1 });
UnilevelPackageRequestSchema.index({ status: 1, createdAt: -1 });
