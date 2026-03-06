import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LeadershipController } from './leadership.controller';
import { LeadershipService } from './leadership.service';

import { LeadershipQualification, LeadershipQualificationSchema } from './schemas/leadership-qualification.schema';
import { LeadershipAward, LeadershipAwardSchema } from './schemas/leadership-award.schema';

// Reads Activations (unilevel points)
import { Activation, ActivationSchema } from '../activations/schemas/activation.schema';

// Reads Pairing awards (5% of pairing)
import { PairingAward, PairingAwardSchema } from '../pairing/schemas/pairing-award.schema';

// Credits Wallet
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    WalletModule,
    MongooseModule.forFeature([
      { name: LeadershipQualification.name, schema: LeadershipQualificationSchema },
      { name: LeadershipAward.name, schema: LeadershipAwardSchema },
      { name: Activation.name, schema: ActivationSchema },
      { name: PairingAward.name, schema: PairingAwardSchema },
    ]),
  ],
  controllers: [LeadershipController],
  providers: [LeadershipService],
  exports: [LeadershipService],
})
export class LeadershipModule {}