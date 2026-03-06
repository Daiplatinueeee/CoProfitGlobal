import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PairingStateDocument = HydratedDocument<PairingState>;

@Schema({ timestamps: true })
export class PairingState {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  periodKey: string; // "YYYY-MM-DD" to match Volume module

  // volume received this period (from VolumeBucket)
  @Prop({ required: true, default: 0 })
  leftEarned: number;

  @Prop({ required: true, default: 0 })
  rightEarned: number;

  // carry from previous period
  @Prop({ required: true, default: 0 })
  leftCarryIn: number;

  @Prop({ required: true, default: 0 })
  rightCarryIn: number;

  // totals used for pairing this period
  @Prop({ required: true, default: 0 })
  leftTotal: number;

  @Prop({ required: true, default: 0 })
  rightTotal: number;

  // pairing results
  @Prop({ required: true, default: 0 })
  pairedPoints: number;

  @Prop({ required: true, default: 0 })
  payoutPhp: number;

  // carry to next period
  @Prop({ required: true, default: 0 })
  leftCarryOut: number;

  @Prop({ required: true, default: 0 })
  rightCarryOut: number;

  // cap tracking
  @Prop({ required: true, default: 1200 })
  capLimit: number;

  @Prop({ required: true, default: 0 })
  capUsed: number;
}

export const PairingStateSchema = SchemaFactory.createForClass(PairingState);

// one pairing state per user per period
PairingStateSchema.index({ userId: 1, periodKey: 1 }, { unique: true });