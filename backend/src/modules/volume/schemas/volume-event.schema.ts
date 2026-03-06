import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { MembershipTier } from '../../users/schemas/user.schema';
import { GenealogySide } from '../../genealogy/schema/genealogy-node.schema';

export type VolumeEventDocument = HydratedDocument<VolumeEvent>;

@Schema({ timestamps: true })
export class VolumeEvent {
  @Prop({ type: Types.ObjectId, ref: 'Activation', required: true, index: true })
  activationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sourceUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  uplineUserId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(GenealogySide), required: true, index: true })
  side: GenealogySide;

  @Prop({ type: String, enum: Object.values(MembershipTier), required: true, index: true })
  tier: MembershipTier;

  @Prop({ required: true })
  points: number;

  @Prop({ required: true, index: true })
  periodKey: string; // e.g. "2026-03-06" or "2026-03"

  @Prop({ required: true })
  occurredAt: Date;
}

export const VolumeEventSchema = SchemaFactory.createForClass(VolumeEvent);

VolumeEventSchema.index({ uplineUserId: 1, periodKey: 1 });
VolumeEventSchema.index({ sourceUserId: 1, periodKey: 1 });