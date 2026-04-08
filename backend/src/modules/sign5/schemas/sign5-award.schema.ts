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

  // how many complete sets of 5 direct referrals have been paid out this month
  @Prop({ required: true, default: 0 })
  timesTriggered: number;

  @Prop({ required: true, default: 0 })
  cashAmountPhp: number;

  @Prop({ type: Date, required: true })
  awardedAt: Date;
}

export const Sign5AwardSchema = SchemaFactory.createForClass(Sign5Award);

Sign5AwardSchema.index({ userId: 1, monthKey: 1, tier: 1 }, { unique: true });