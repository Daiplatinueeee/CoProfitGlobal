import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MembershipTier } from '../../users/schemas/user.schema';
import { GenealogySide } from '../../genealogy/schema/genealogy-node.schema';

export type ActivationDocument = HydratedDocument<Activation>;

@Schema({ timestamps: true })
export class Activation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sponsorId: Types.ObjectId;

  // Placement parent resolved by spillover
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  placementParentUserId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(GenealogySide), required: true })
  position: GenealogySide;

  @Prop({ type: String, enum: Object.values(MembershipTier), required: true, index: true })
  tier: MembershipTier;

  // Points based on tier: bronze=1, silver=3, gold=5, platinum=7
  @Prop({ required: true })
  points: number;

  // Which pin was consumed
  @Prop({ type: Types.ObjectId, ref: 'ProductPin', required: true, index: true })
  pinId: Types.ObjectId;

  @Prop({ required: true })
  activatedAt: Date;
}

export const ActivationSchema = SchemaFactory.createForClass(Activation);

// Useful indexes
ActivationSchema.index({ userId: 1, createdAt: -1 });
ActivationSchema.index({ sponsorId: 1, createdAt: -1 });
ActivationSchema.index({ tier: 1, createdAt: -1 });