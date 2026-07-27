import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';

import { UnilevelProductsController } from './unilevel-products.controller';
import { UnilevelProductsService } from './unilevel-products.service';

import { UnilevelProduct, UnilevelProductSchema } from './schemas/unilevel-product.schema';
import { UnilevelPurchase, UnilevelPurchaseSchema } from './schemas/unilevel-purchase.schema';
import { UnilevelPin, UnilevelPinSchema } from './schemas/unilevel-pin.schema';
import { LifestyleReward, LifestyleRewardSchema } from './schemas/lifestyle-reward.schema';
import { RewardRedemption, RewardRedemptionSchema } from './schemas/reward-redemption.schema';
import { UnilevelPvDeduction, UnilevelPvDeductionSchema } from './schemas/unilevel-pv-deduction.schema';
import { UnilevelPackageRequest, UnilevelPackageRequestSchema } from './schemas/unilevel-package-request.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    MulterModule.register({}),
    MongooseModule.forFeature([
      { name: UnilevelProduct.name,        schema: UnilevelProductSchema },
      { name: UnilevelPurchase.name,       schema: UnilevelPurchaseSchema },
      { name: UnilevelPin.name,            schema: UnilevelPinSchema },
      { name: LifestyleReward.name,        schema: LifestyleRewardSchema },
      { name: RewardRedemption.name,       schema: RewardRedemptionSchema },
      { name: UnilevelPvDeduction.name,    schema: UnilevelPvDeductionSchema },
      { name: UnilevelPackageRequest.name, schema: UnilevelPackageRequestSchema },
      { name: User.name,                   schema: UserSchema },
    ]),
    WalletModule,
  ],
  controllers: [UnilevelProductsController],
  providers: [UnilevelProductsService],
  exports: [UnilevelProductsService],
})
export class UnilevelProductsModule {}
