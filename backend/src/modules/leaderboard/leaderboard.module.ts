import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';

import { User, UserSchema } from '../users/schemas/user.schema';
import { WalletBalance, WalletBalanceSchema } from '../wallet/schemas/wallet-balance.schema';
import { Activation, ActivationSchema } from '../activations/schemas/activation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name,          schema: UserSchema },
      { name: WalletBalance.name, schema: WalletBalanceSchema },
      { name: Activation.name,    schema: ActivationSchema },
    ]),
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}
