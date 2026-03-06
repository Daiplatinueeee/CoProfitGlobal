import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MembershipTier } from '../../users/schemas/user.schema';

export type Sign5AwardDocument = HydratedDocument<Sign5Award>;

@Schema({ timestamps: true })
export class Sign5Award {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true }) // YYYY-MM
  monthKey: string;

  @Prop({ type: String, enum: Object.values(MembershipTier), required: true, index: true })
  tier: MembershipTier;

  @Prop({ required: true })
  referralsCount: number;

  @Prop({ required: true })
  setsOfFive: number; // floor(count/5)

  @Prop({ required: true })
  cashSetsPaid: number; // min(setsOfFive, 5)

  @Prop({ required: true })
  gcSetsPaid: number; // max(setsOfFive - 5, 0)

  @Prop({ required: true })
  cashAmountPhp: number; // cashSetsPaid * tierCashValue

  @Prop({ required: true })
  gcPointsAmount: number; // gcSetsPaid * tierCashValue (or your chosen conversion)

  @Prop({ type: Date, required: true })
  awardedAt: Date;
}

export const Sign5AwardSchema = SchemaFactory.createForClass(Sign5Award);

Sign5AwardSchema.index({ userId: 1, monthKey: 1, tier: 1 }, { unique: true });