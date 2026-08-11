import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderOnlineService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  /**
   * User places a new order from their cart. Always starts as PENDING.
   */
  async create(userId: string, dto: CreateOrderDto) {
    const total = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await this.orderModel.create({
      userId:               this.toObjectId(userId),
      items:                dto.items,
      total,
      fullName:             dto.fullName,
      contactNumber:        dto.contactNumber,
      address:              dto.address,
      paymentMethod:        dto.paymentMethod,
      paymentAccountName:   dto.paymentAccountName ?? '',
      paymentAccountNumber: dto.paymentAccountNumber ?? '',
      proofImageUrl:        dto.proofImageUrl ?? '',
      status:               OrderStatus.PENDING,
    });

    return this.format(order.toObject());
  }

  /**
   * Returns the requesting user's orders, newest first.
   */
  async getMyOrders(userId: string) {
    const rows = await this.orderModel
      .find({ userId: this.toObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
    return rows.map(this.format);
  }

  /**
   * Admin: returns all orders across all users, optionally filtered by status.
   */
  async getAll(status?: OrderStatus) {
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const rows = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return rows.map(this.format);
  }

  private async findOwned(userId: string, orderId: string) {
    const doc = await this.orderModel.findById(orderId);
    if (!doc) throw new NotFoundException('Order not found');
    if (doc.userId.toString() !== userId) {
      throw new ForbiddenException('You can only manage your own orders');
    }
    return doc;
  }

  /**
   * Admin: accepts a PENDING order, moving it to SHIPPING.
   * Not scoped to an owner — customers cannot accept their own orders.
   */
  async accept(orderId: string) {
    const doc = await this.orderModel.findById(orderId);
    if (!doc) throw new NotFoundException('Order not found');
    if (doc.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Order is already ${doc.status} and can no longer be accepted`);
    }
    doc.status = OrderStatus.SHIPPING;
    await doc.save();
    return this.format(doc.toObject());
  }

  /**
   * Marks a SHIPPING order as received, moving it to COMPLETED.
   */
  async markReceived(userId: string, orderId: string) {
    const doc = await this.findOwned(userId, orderId);
    if (doc.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(`Order must be shipping before it can be marked as received`);
    }
    doc.status = OrderStatus.COMPLETED;
    await doc.save();
    return this.format(doc.toObject());
  }

  /**
   * Cancels a PENDING order.
   */
  async cancel(userId: string, orderId: string) {
    const doc = await this.findOwned(userId, orderId);
    if (doc.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Order is already ${doc.status} and can no longer be cancelled`);
    }
    doc.status = OrderStatus.CANCELLED;
    await doc.save();
    return this.format(doc.toObject());
  }

  private format(doc: any) {
    return {
      id:                   doc._id?.toString?.() ?? doc._id,
      userId:               doc.userId?.toString(),
      items:                doc.items ?? [],
      total:                doc.total,
      fullName:             doc.fullName,
      contactNumber:        doc.contactNumber,
      address:              doc.address,
      paymentMethod:        doc.paymentMethod,
      paymentAccountName:   doc.paymentAccountName ?? '',
      paymentAccountNumber: doc.paymentAccountNumber ?? '',
      proofImageUrl:        doc.proofImageUrl ?? '',
      status:               doc.status,
      createdAt:            doc.createdAt,
      updatedAt:            doc.updatedAt,
    };
  }
}
