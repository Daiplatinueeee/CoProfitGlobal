import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type Sign5StatusDocument = HydratedDocument<Sign5Status>;

@Schema({ timestamps: true })
export class Sign5Status {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true }) // YYYY-MM
  monthKey: string;

  // Direct referral activations counts by tier (within month)
  @Prop({ required: true, default: 0 }) bronzeCount: number;
  @Prop({ required: true, default: 0 }) silverCount: number;
  @Prop({ required: true, default: 0 }) goldCount: number;
  @Prop({ required: true, default: 0 }) platinumCount: number;

  @Prop({ type: Date, required: true })
  evaluatedAt: Date;
}

export const Sign5StatusSchema = SchemaFactory.createForClass(Sign5Status);

Sign5StatusSchema.index({ userId: 1, monthKey: 1 }, { unique: true });