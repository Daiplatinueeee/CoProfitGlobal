import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WithdrawalRequestDocument = HydratedDocument<WithdrawalRequest>;

export enum WithdrawalStatus {
  PENDING   = 'pending',
  APPROVED  = 'approved',
  REJECTED  = 'rejected',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class WithdrawalRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  vat: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ required: true })
  accountName: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({
    type: String,
    enum: Object.values(WithdrawalStatus),
    default: WithdrawalStatus.PENDING,
    index: true,
  })
  status: WithdrawalStatus;

  @Prop({ default: '' })
  adminNote: string;

  @Prop({ type: Date, default: null })
  processedAt: Date | null;
}

export const WithdrawalRequestSchema = SchemaFactory.createForClass(WithdrawalRequest);
WithdrawalRequestSchema.index({ userId: 1, createdAt: -1 });
