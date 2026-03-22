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

  @Prop({
    type: String,
    enum: Object.values(MembershipTier),
    required: true,
    index: true,
  })
  tier: MembershipTier;

  @Prop({ required: true, default: 0 })
  referralsCount: number;

  // 0 or 1 only
  // becomes 1 once the user reaches at least 5 direct activations of this tier in the month
  @Prop({ required: true, default: 0 })
  cashSetPaid: number;

  // number of referrals beyond the first 5
  @Prop({ required: true, default: 0 })
  gcReferralCountPaid: number;

  @Prop({ required: true, default: 0 })
  cashAmountPhp: number;

  // current implementation:
  // gcPointsAmount = gcReferralCountPaid * tierRewardValue
  @Prop({ required: true, default: 0 })
  gcPointsAmount: number;

  @Prop({ type: Date, required: true })
  awardedAt: Date;
}

export const Sign5AwardSchema = SchemaFactory.createForClass(Sign5Award);

Sign5AwardSchema.index({ userId: 1, monthKey: 1, tier: 1 }, { unique: true });