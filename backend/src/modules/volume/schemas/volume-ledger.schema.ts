import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
import { MembershipTier } from '../../users/schemas/user.schema'
import { VolumeLeg } from './volume-bucket.schema'

export type VolumeLedgerDocument = HydratedDocument<VolumeLedger>

@Schema({ timestamps: true, versionKey: false })
export class VolumeLedger {
  @Prop({ required: true, index: true })
  eventKey: string

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerUserId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sourceUserId: Types.ObjectId

  @Prop({ type: String, enum: Object.values(VolumeLeg), required: true, index: true })
  leg: VolumeLeg

  @Prop({ type: String, enum: Object.values(MembershipTier), required: true, index: true })
  membershipTier: MembershipTier

  @Prop({ type: Number, required: true })
  points: number

  @Prop({ type: String, required: true })
  reason: string
}

export const VolumeLedgerSchema = SchemaFactory.createForClass(VolumeLedger)

VolumeLedgerSchema.index({ eventKey: 1, ownerUserId: 1 }, { unique: true })