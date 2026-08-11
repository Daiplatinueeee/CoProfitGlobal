import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { GcRewardsController } from './gc-rewards.controller';
import { GcRewardsService } from './gc-rewards.service';
import { GcRedemption, GcRedemptionSchema } from './schemas/gc-redemption.schema';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GcRedemption.name, schema: GcRedemptionSchema },
    ]),
    WalletModule,
  ],
  controllers: [GcRewardsController],
  providers: [GcRewardsService],
  exports: [GcRewardsService],
})
export class GcRewardsModule {}
