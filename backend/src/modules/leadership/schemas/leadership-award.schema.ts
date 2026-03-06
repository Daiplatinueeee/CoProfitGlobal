import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LeadershipAwardDocument = HydratedDocument<LeadershipAward>;

@Schema({ timestamps: true })
export class LeadershipAward {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true }) // YYYY-MM
  monthKey: string;

  @Prop({ required: true })
  pairingTotalPhp: number;

  @Prop({ required: true })
  rate: number; // 0.05

  @Prop({ required: true })
  leadershipPhp: number;

  @Prop({ required: true })
  awardedAt: Date;
}

export const LeadershipAwardSchema = SchemaFactory.createForClass(LeadershipAward);

LeadershipAwardSchema.index({ userId: 1, monthKey: 1 }, { unique: true });