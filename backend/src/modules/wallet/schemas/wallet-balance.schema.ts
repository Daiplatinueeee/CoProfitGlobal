import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { WalletCurrency } from './wallet-transaction.schema';

export type WalletBalanceDocument = HydratedDocument<WalletBalance>;

@Schema({ timestamps: true })
export class WalletBalance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(WalletCurrency), required: true, index: true })
  currency: WalletCurrency;

  @Prop({ required: true, default: 0 })
  balance: number;
}

export const WalletBalanceSchema = SchemaFactory.createForClass(WalletBalance);

// one balance row per user per currency
WalletBalanceSchema.index({ userId: 1, currency: 1 }, { unique: true });