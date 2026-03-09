import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'

export type GenealogyNodeDocument = HydratedDocument<GenealogyNode>

export enum GenealogySide {
  LEFT = 'left',
  RIGHT = 'right',
}

@Schema({ timestamps: true })
export class GenealogyNode {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  parentUserId: Types.ObjectId | null

  @Prop({ type: String, enum: GenealogySide, default: null })
  position: GenealogySide | null

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  leftChildUserId: Types.ObjectId | null

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rightChildUserId: Types.ObjectId | null

  @Prop({ type: Number, default: 0 })
  depth: number
  
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  ancestors: Types.ObjectId[]

  @Prop({ required: true, trim: true })
  username: string

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string

  @Prop({ required: false })
  password?: string

  @Prop({ default: '' })
  profileImage: string

  @Prop({ required: true, unique: true, trim: true })
  referralCode: string

  @Prop({ type: Number, default: 0 })
  leftLegPoints: number

  @Prop({ type: Number, default: 0 })
  rightLegPoints: number

  @Prop({ type: Number, required: false })
  age?: number

  @Prop({ required: false })
  contact?: string

  @Prop({ required: false })
  address?: string

  @Prop({ required: false })
  beneficiary?: string

  @Prop({ required: false })
  birthday?: string
  }

export const GenealogyNodeSchema = SchemaFactory.createForClass(GenealogyNode)

GenealogyNodeSchema.index({ parentUserId: 1 })
GenealogyNodeSchema.index({ ancestors: 1 })