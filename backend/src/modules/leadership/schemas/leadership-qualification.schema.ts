import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LeadershipQualificationDocument = HydratedDocument<LeadershipQualification>;

@Schema({ timestamps: true })
export class LeadershipQualification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true }) // YYYY-MM
  monthKey: string;

  // computed unilevel points (direct referral activation points)
  @Prop({ required: true, default: 0 })
  unilevelPoints: number;

  @Prop({ required: true, default: 1500 })
  threshold: number;

  @Prop({ required: true, default: false })
  qualified: boolean;

  // evaluation window: 15th to end-of-window
  @Prop({ required: true })
  windowStart: Date;

  @Prop({ required: true })
  windowEnd: Date;

  @Prop({ required: true })
  evaluatedAt: Date;
}

export const LeadershipQualificationSchema = SchemaFactory.createForClass(LeadershipQualification);

LeadershipQualificationSchema.index({ userId: 1, monthKey: 1 }, { unique: true });