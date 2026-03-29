import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MembershipTier } from '../../users/schemas/user.schema';
import { PairingCycle } from '../enums/pairing-cycle.enum';

export type PairingStateDocument = HydratedDocument<PairingState>;

@Schema({ timestamps: true })
export class PairingState {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  // Format: YYYY-MM-DD-AM or YYYY-MM-DD-PM
  @Prop({ required: true, index: true })
  periodKey: string;

  // Which cycle this state belongs to
  @Prop({ type: String, required: true })
  cycle: PairingCycle;

  // User's membership tier at time of pairing
  @Prop({ type: String, enum: Object.values(MembershipTier), required: true })
  membershipTier: MembershipTier;

  // Points available at the start of this cycle (includes carry from previous cycle)
  @Prop({ required: true, default: 0 })
  leftAvailable: number;

  @Prop({ required: true, default: 0 })
  rightAvailable: number;

  // Pairing results
  @Prop({ required: true, default: 0 })
  pairedPoints: number;

  @Prop({ required: true, default: 0 })
  payoutPhp: number;

  // Remainder after pairing — carries into next cycle
  @Prop({ required: true, default: 0 })
  leftCarryOut: number;

  @Prop({ required: true, default: 0 })
  rightCarryOut: number;

  // Cap tracking
  @Prop({ required: true, default: 0 })
  capLimit: number;

  @Prop({ required: true, default: 0 })
  capUsed: number;
}

export const PairingStateSchema = SchemaFactory.createForClass(PairingState);

// One pairing state per user per cycle
PairingStateSchema.index({ userId: 1, periodKey: 1 }, { unique: true });