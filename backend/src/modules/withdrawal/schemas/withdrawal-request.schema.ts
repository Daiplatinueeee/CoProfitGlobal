import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WalletCurrency } from '../../wallet/schemas/wallet-transaction.schema';

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

  @Prop({
    type: String,
    enum: Object.values(WalletCurrency),
    default: WalletCurrency.PHP,
    index: true,
  })
  currency: WalletCurrency;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 0 })
  vat: number;

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({ default: '' })
  paymentMethod: string;

  @Prop({ default: '' })
  accountName: string;

  @Prop({ default: '' })
  contactNumber: string;

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
WithdrawalRequestSchema.index({ currency: 1, status: 1 });
