import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PairingAwardDocument = HydratedDocument<PairingAward>;

@Schema({ timestamps: true })
export class PairingAward {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  periodKey: string;

  @Prop({ required: true })
  pairedPoints: number;

  @Prop({ required: true })
  payoutPhp: number;

  @Prop({ required: true })
  ratePhpPerPoint: number; // 400

  @Prop({ required: true, default: 1200 })
  capLimit: number;
}

export const PairingAwardSchema = SchemaFactory.createForClass(PairingAward);

PairingAwardSchema.index({ userId: 1, periodKey: 1 }, { unique: true });