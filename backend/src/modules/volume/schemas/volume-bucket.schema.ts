import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type VolumeBucketDocument = HydratedDocument<VolumeBucket>

export enum VolumeLeg {
  LEFT = 'left',
  RIGHT = 'right',
}

@Schema({ timestamps: true, versionKey: false })
export class VolumeBucket {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerUserId: Types.ObjectId

  @Prop({ type: String, enum: Object.values(VolumeLeg), required: true, index: true })
  leg: VolumeLeg

  @Prop({ type: Number, default: 0 })
  totalPoints: number

  @Prop({ type: Number, default: 0 })
  availablePoints: number
}

export const VolumeBucketSchema = SchemaFactory.createForClass(VolumeBucket)

VolumeBucketSchema.index({ ownerUserId: 1, leg: 1 }, { unique: true })