import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UnilevelPinDocument = UnilevelPin & Document;

export enum UnilevelPinStatus {
  UNUSED = 'UNUSED',
  USED   = 'USED',
  VOID   = 'VOID',
}

@Schema({ timestamps: true, collection: 'unilevel_pins' })
export class UnilevelPin {
  @Prop({ required: true, unique: true })
  pin: string;

  @Prop({ type: Types.ObjectId, ref: 'UnilevelProduct', default: null })
  productId?: Types.ObjectId | null;

  @Prop({ required: true, min: 0 })
  pv: number;

  // PHP price this pin represents — snapshotted at generation time (from the
  // linked product, or entered directly for freeform pins). Used to compute
  // the monthly ₱1,500 purchase requirement, which is tracked separately
  // from PV since price and PV are not 1:1 per product.
  @Prop({ required: true, min: 0, default: 0 })
  price: number;

  @Prop({ required: false })
  productName: string;

  @Prop({ type: String, enum: Object.values(UnilevelPinStatus), default: UnilevelPinStatus.UNUSED })
  status: UnilevelPinStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  usedByUserId?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  usedAt?: Date | null;

  @Prop({ type: String, default: null })
  monthKey?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdByAdminId?: Types.ObjectId | null;

  @Prop({ type: String, default: '' })
  note?: string;
}

export const UnilevelPinSchema = SchemaFactory.createForClass(UnilevelPin);

UnilevelPinSchema.index({ usedByUserId: 1 });
UnilevelPinSchema.index({ usedByUserId: 1, monthKey: 1, status: 1 });

UnilevelPinSchema.pre('save', function (this: any) {
  if (this.pin && this.pin.startsWith('$2')) {
    throw new Error(
      `UnilevelPin.pin must be plain text (e.g. "AB1234"), not a bcrypt hash.`,
    );
  }
});
