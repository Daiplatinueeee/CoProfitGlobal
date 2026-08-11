import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING   = 'pending',
  SHIPPING  = 'shipping',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: '' })
  image: string;

  @Prop({ required: true, min: 1 })
  quantity: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  total: number;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  contactNumber: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ default: '' })
  paymentAccountName: string;

  @Prop({ default: '' })
  paymentAccountNumber: string;

  @Prop({ default: '' })
  proofImageUrl: string;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
    index: true,
  })
  status: OrderStatus;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, createdAt: -1 });
