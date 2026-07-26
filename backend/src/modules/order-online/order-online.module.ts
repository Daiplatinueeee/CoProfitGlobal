import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrderOnlineService } from './order-online.service';
import { OrderOnlineController } from './order-online.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [OrderOnlineController],
  providers: [OrderOnlineService, RolesGuard],
  exports: [OrderOnlineService],
})
export class OrderOnlineModule {}
