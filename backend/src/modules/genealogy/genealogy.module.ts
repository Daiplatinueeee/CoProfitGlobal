import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { GenealogyController } from './genealogy.controller'
import { GenealogyService } from './genealogy.service'
import {
  GenealogyNode,
  GenealogyNodeSchema,
} from './schema/genealogy-node.schema'
import { User, UserSchema } from '../users/schemas/user.schema'
import {
  ProductPin,
  ProductPinSchema,
} from '../product-pins/schema/product-pins.schema'
import { VolumeModule } from '../volume/volume.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GenealogyNode.name, schema: GenealogyNodeSchema },
      { name: User.name, schema: UserSchema },
      { name: ProductPin.name, schema: ProductPinSchema },
    ]),
    VolumeModule,
  ],
  controllers: [GenealogyController],
  providers: [GenealogyService],
  exports: [GenealogyService],
})
export class GenealogyModule {}