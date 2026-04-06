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
import { WalletModule } from '../wallet/wallet.module'
import { VolumeBucket, VolumeBucketSchema } from '../volume/schemas/volume-bucket.schema'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GenealogyNode.name, schema: GenealogyNodeSchema },
      { name: User.name, schema: UserSchema },
      { name: ProductPin.name, schema: ProductPinSchema },
      { name: VolumeBucket.name, schema: VolumeBucketSchema },
    ]),
    VolumeModule,
    WalletModule,
    UsersModule,
  ],
  controllers: [GenealogyController],
  providers: [GenealogyService],
  exports: [GenealogyService],
})
export class GenealogyModule {}