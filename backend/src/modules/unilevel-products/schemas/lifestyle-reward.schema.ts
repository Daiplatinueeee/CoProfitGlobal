import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LifestyleRewardDocument = LifestyleReward & Document;

export enum RewardStatus {
  ACTIVE   = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true, collection: 'lifestyle_rewards' })
export class LifestyleReward {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true, min: 0 })
  pointsCost: number;

  @Prop({ default: '' })
  imageUrl: string;

  @Prop({ default: '' })
  category: string;

  @Prop({ required: true, min: 0 })
  stock: number;

  @Prop({ type: String, enum: Object.values(RewardStatus), default: RewardStatus.ACTIVE })
  status: RewardStatus;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const LifestyleRewardSchema = SchemaFactory.createForClass(LifestyleReward);
