import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RewardRedemptionDocument = RewardRedemption & Document;

@Schema({ timestamps: true, collection: 'reward_redemptions' })
export class RewardRedemption {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LifestyleReward', required: true })
  rewardId: Types.ObjectId;

  @Prop({ required: true })
  rewardName: string;

  @Prop({ required: true, min: 0 })
  pvCost: number;

  @Prop({ type: Date, default: () => new Date() })
  redeemedAt: Date;
}

export const RewardRedemptionSchema = SchemaFactory.createForClass(RewardRedemption);

RewardRedemptionSchema.index({ userId: 1 });
