import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PairingService } from './pairing.service';
import { PairingController } from './pairing.controller';
import { PairingScheduler } from './pairing.scheduler';

import { PairingState, PairingStateSchema } from './schemas/pairing-state.schema';
import { PairingAward, PairingAwardSchema } from './schemas/pairing-award.schema';
import { VolumeBucket, VolumeBucketSchema } from '../volume/schemas/volume-bucket.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { GenealogyNode, GenealogyNodeSchema } from '../genealogy/schema/genealogy-node.schema';

import { WalletModule } from '../wallet/wallet.module';
import { UnilevelProductsModule } from '../unilevel-products/unilevel-products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PairingState.name,  schema: PairingStateSchema },
      { name: PairingAward.name,  schema: PairingAwardSchema },
      { name: VolumeBucket.name,  schema: VolumeBucketSchema },
      { name: User.name,          schema: UserSchema },
      { name: GenealogyNode.name, schema: GenealogyNodeSchema },
    ]),
    WalletModule,
    UnilevelProductsModule,
  ],
  controllers: [PairingController],
  providers: [PairingService, PairingScheduler],
  exports: [PairingService],
})
export class PairingModule {}