import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PairingService } from './pairing.service';
import { PairingController } from './pairing.controller';
import { PairingScheduler } from './pairing.scheduler';

import { PairingState, PairingStateSchema } from './schemas/pairing-state.schema';
import { PairingAward, PairingAwardSchema } from './schemas/pairing-award.schema';
import { VolumeBucket, VolumeBucketSchema } from '../volume/schemas/volume-bucket.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PairingState.name,  schema: PairingStateSchema },
      { name: PairingAward.name,  schema: PairingAwardSchema },
      { name: VolumeBucket.name,  schema: VolumeBucketSchema },
      { name: User.name,          schema: UserSchema },
    ]),
    WalletModule, // ← gives PairingService access to WalletService
  ],
  controllers: [PairingController],
  providers: [PairingService, PairingScheduler],
  exports: [PairingService],
})
export class PairingModule {}