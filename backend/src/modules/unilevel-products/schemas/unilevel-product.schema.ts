import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UnilevelProductDocument = HydratedDocument<UnilevelProduct>;

export enum ProductStatus {
  ACTIVE   = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true })
export class UnilevelProduct {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({ required: true })
  price: number; // PHP

  @Prop({ required: true })
  pv: number; // unilevel point value credited on approval

  @Prop({ default: '' })
  imageUrl: string; // empty = frontend uses local fallback

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({
    type: String,
    enum: Object.values(ProductStatus),
    default: ProductStatus.ACTIVE,
    index: true,
  })
  status: ProductStatus;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;
}

export const UnilevelProductSchema = SchemaFactory.createForClass(UnilevelProduct);

UnilevelProductSchema.index({ status: 1, sortOrder: 1 });
