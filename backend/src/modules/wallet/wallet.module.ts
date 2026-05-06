import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

import { WalletTransaction, WalletTransactionSchema } from './schemas/wallet-transaction.schema';
import { WalletBalance, WalletBalanceSchema } from './schemas/wallet-balance.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: WalletBalance.name, schema: WalletBalanceSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}