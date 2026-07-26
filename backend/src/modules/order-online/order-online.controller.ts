import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { OrderOnlineService } from './order-online.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SystemRole } from '../users/schemas/user.schema';
import { OrderStatus } from './schemas/order.schema';

@Controller('order-online')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderOnlineController {
  constructor(private readonly orderOnlineService: OrderOnlineService) {}

  /**
   * POST /order-online
   * User places a new order from their cart. userId taken from JWT.
   */
  @Post()
  create(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.orderOnlineService.create(req.user.sub, dto);
  }

  /**
   * GET /order-online/my
   * Returns the current user's orders (current + history), newest first.
   */
  @Get('my')
  myOrders(@Request() req: any) {
    return this.orderOnlineService.getMyOrders(req.user.sub);
  }

  /**
   * GET /order-online/all?status=pending
   * Admin only — lists all orders across all users, optionally filtered by status.
   */
  @Get('all')
  @Roles(SystemRole.ADMIN)
  getAll(@Query('status') status?: OrderStatus) {
    return this.orderOnlineService.getAll(status);
  }

  /**
   * PATCH /order-online/:id/accept
   * Admin only — accepts a pending order, moving it to shipping.
   * Customers cannot accept their own orders.
   */
  @Patch(':id/accept')
  @Roles(SystemRole.ADMIN)
  accept(@Param('id') id: string) {
    return this.orderOnlineService.accept(id);
  }

  /**
   * PATCH /order-online/:id/received
   * User marks their own shipping order as received — moves it to completed.
   */
  @Patch(':id/received')
  markReceived(@Request() req: any, @Param('id') id: string) {
    return this.orderOnlineService.markReceived(req.user.sub, id);
  }

  /**
   * PATCH /order-online/:id/cancel
   * User cancels their own pending order.
   */
  @Patch(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.orderOnlineService.cancel(req.user.sub, id);
  }
}
