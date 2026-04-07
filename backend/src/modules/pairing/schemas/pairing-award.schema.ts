import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MembershipTier } from '../../users/schemas/user.schema';
import { PairingCycle } from '../enums/pairing-cycle.enum';

export type PairingAwardDocument = HydratedDocument<PairingAward>;

@Schema({ timestamps: true })
export class PairingAward {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  // Format: YYYY-MM-DD-AM or YYYY-MM-DD-PM
  @Prop({ required: true, index: true })
  periodKey: string;

  // Which cycle this award belongs to
  @Prop({ type: String, required: true })
  cycle: string;

  // User's membership tier at time of pairing
  @Prop({ type: String, enum: Object.values(MembershipTier), required: true })
  membershipTier: MembershipTier;

  @Prop({ required: true, default: 0 })
  pairedPoints: number;

  @Prop({ required: true, default: 0 })
  payoutPhp: number;

  @Prop({ required: true, default: 400 })
  ratePhpPerPoint: number;

  // Cap limit based on membership tier
  // Bronze=3, Silver=16, Gold=30, Platinum=50
  @Prop({ required: true, default: 0 })
  capLimit: number;

  // GC credited per pairing: 1 GC per 5 paired points (the 5th point pays GC instead of PHP)
  @Prop({ required: true, default: 0 })
  gcAwarded: number;
}

export const PairingAwardSchema = SchemaFactory.createForClass(PairingAward);

// One award per user per cycle
PairingAwardSchema.index({ userId: 1, periodKey: 1 }, { unique: true });