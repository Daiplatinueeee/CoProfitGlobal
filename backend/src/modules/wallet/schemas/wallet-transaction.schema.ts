import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WalletTransactionDocument = HydratedDocument<WalletTransaction>;

export enum WalletCurrency {
  PHP = 'php',
  POINTS = 'points',
  GC_POINTS = 'gc_points',
}

export enum WalletTxnType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum WalletTxnSource {
  PAIRING             = 'pairing',
  PAIRING_FLUSH       = 'pairing_flush',
  REPEAT_BINARY       = 'repeat_binary',
  REPEAT_BINARY_DEBIT = 'repeat_binary_debit',
  SIGN5               = 'sign5',
  LEADERSHIP          = 'leadership',
  SPILLOVER           = 'spillover',
  REFERRAL_DIRECT     = 'referral_direct',
  REFERRAL_INDIRECT   = 'referral_indirect',
  ADMIN_ADJUSTMENT    = 'admin_adjustment',
  WITHDRAWAL          = 'withdrawal',
  TIER_UPGRADE        = 'tier_upgrade',
}

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(WalletCurrency), required: true, index: true })
  currency: WalletCurrency;

  @Prop({ type: String, enum: Object.values(WalletTxnType), required: true })
  type: WalletTxnType;

  @Prop({ required: true })
  amount: number; // always positive; type decides +/- effect

  @Prop({ type: String, enum: Object.values(WalletTxnSource), required: true, index: true })
  source: WalletTxnSource;

  // idempotency key to prevent double posting (e.g., "pairing:{userId}:{periodKey}")
  @Prop({ type: String, required: true, index: true, unique: true })
  refKey: string;

  @Prop({ type: String, default: '' })
  note?: string;

  @Prop({ type: Object, default: {} })
  meta?: Record<string, any>;

  @Prop({ required: true })
  postedAt: Date;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ userId: 1, currency: 1, createdAt: -1 });