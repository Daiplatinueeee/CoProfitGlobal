import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GcRedemptionDocument = GcRedemption & Document;

@Schema({ timestamps: true, collection: 'gc_redemptions' })
export class GcRedemption {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 8 })
  level: number;

  @Prop({ required: true })
  rewardName: string;

  @Prop({ required: true, min: 0 })
  gcCost: number;

  @Prop({ required: true, unique: true })
  couponCode: string;

  @Prop({ type: Date, default: () => new Date() })
  redeemedAt: Date;
}

export const GcRedemptionSchema = SchemaFactory.createForClass(GcRedemption);
GcRedemptionSchema.index({ userId: 1, redeemedAt: -1 });
