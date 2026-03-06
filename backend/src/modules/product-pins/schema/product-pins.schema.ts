import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MembershipTier } from '../../users/schemas/user.schema';

export type ProductPinDocument = ProductPin & Document;

export enum PinStatus {
  UNUSED = 'unused',
  USED = 'used',
  VOID = 'void',
}

@Schema({ timestamps: true })
export class ProductPin {
  @Prop({ required: true, unique: true })
  pinHash: string; // hash of 4-digit pin (never store raw pin)

  @Prop({ type: String, enum: Object.values(MembershipTier), required: true })
  tier: MembershipTier;

  @Prop({ type: String, enum: Object.values(PinStatus), default: PinStatus.UNUSED })
  status: PinStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  usedByUserId?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  usedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdByAdminId?: Types.ObjectId | null;

  // Optional: internal admin notes
  @Prop({ type: String, default: '' })
  note?: string;
}

export const ProductPinSchema = SchemaFactory.createForClass(ProductPin);