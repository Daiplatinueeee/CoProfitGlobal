import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LeadershipController } from './leadership.controller';
import { LeadershipService } from './leadership.service';

import { LeadershipQualification, LeadershipQualificationSchema } from './schemas/leadership-qualification.schema';
import { LeadershipAward, LeadershipAwardSchema } from './schemas/leadership-award.schema';

// Unilevel product purchases (source of unilevel PV for leadership qualification)
import { UnilevelProductsModule } from '../unilevel-products/unilevel-products.module';

// Reads Pairing awards (5% of pairing)
import { PairingAward, PairingAwardSchema } from '../pairing/schemas/pairing-award.schema';

// Credits Wallet
import { WalletModule } from '../wallet/wallet.module';
import { GenealogyNode, GenealogyNodeSchema } from '../genealogy/schema/genealogy-node.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    WalletModule,
    UnilevelProductsModule,
    MongooseModule.forFeature([
      { name: LeadershipQualification.name, schema: LeadershipQualificationSchema },
      { name: LeadershipAward.name, schema: LeadershipAwardSchema },
      { name: PairingAward.name, schema: PairingAwardSchema },
      { name: GenealogyNode.name, schema: GenealogyNodeSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [LeadershipController],
  providers: [LeadershipService],
  exports: [LeadershipService],
})
export class LeadershipModule {}