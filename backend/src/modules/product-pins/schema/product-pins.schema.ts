import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MembershipTier } from '../../users/schemas/user.schema';

export type ProductPinDocument = ProductPin & Document;

export enum PinStatus {
  UNUSED = 'UNUSED',
  USED = 'USED',
  VOID = 'VOID',
}

@Schema({ timestamps: true })
export class ProductPin {
  @Prop({ required: true, unique: true })
  pin: string; // plain-text pin, e.g. AB1234 — NEVER hashed

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

  @Prop({ type: String, default: '' })
  note?: string;

  @Prop({ type: Boolean, default: false })
  isFree: boolean;
}

export const ProductPinSchema = SchemaFactory.createForClass(ProductPin);

// ✅ Runtime guard: throws immediately if someone accidentally passes a bcrypt
//    hash as the pin value, making the bug loud and obvious at save time.
ProductPinSchema.pre('save', function (this: any) {
  if (this.pin && this.pin.startsWith('$2')) {
    throw new Error(
      `ProductPin.pin must be plain text (e.g. "AB1234"), not a bcrypt hash. ` +
      `Remove any bcrypt.hash() call on the pin value before saving.`,
    );
  }
});