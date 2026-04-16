import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';

import { UnilevelProductsController } from './unilevel-products.controller';
import { UnilevelProductsService } from './unilevel-products.service';

import { UnilevelProduct, UnilevelProductSchema } from './schemas/unilevel-product.schema';
import { UnilevelPurchase, UnilevelPurchaseSchema } from './schemas/unilevel-purchase.schema';

@Module({
  imports: [
    MulterModule.register({}),
    MongooseModule.forFeature([
      { name: UnilevelProduct.name, schema: UnilevelProductSchema },
      { name: UnilevelPurchase.name, schema: UnilevelPurchaseSchema },
    ]),
  ],
  controllers: [UnilevelProductsController],
  providers: [UnilevelProductsService],
  exports: [UnilevelProductsService],
})
export class UnilevelProductsModule {}
