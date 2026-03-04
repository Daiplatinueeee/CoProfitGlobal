import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductPin, ProductPinSchema } from './schema/product-pins.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: ProductPin.name, schema: ProductPinSchema }])],
  exports: [MongooseModule],
})
export class ProductPinsModule {}