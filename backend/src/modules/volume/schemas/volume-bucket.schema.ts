import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VolumeBucketDocument = HydratedDocument<VolumeBucket>;

@Schema({ timestamps: true })
export class VolumeBucket {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  periodKey: string; // "YYYY-MM-DD" (daily) or "YYYY-MM" (monthly)

  @Prop({ required: true, default: 0 })
  leftPoints: number;

  @Prop({ required: true, default: 0 })
  rightPoints: number;
}

export const VolumeBucketSchema = SchemaFactory.createForClass(VolumeBucket);

// One bucket per user per period
VolumeBucketSchema.index({ userId: 1, periodKey: 1 }, { unique: true });