import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Sign5Controller } from './sign5.controller';
import { Sign5Service } from './sign5.service';

import { Sign5Status, Sign5StatusSchema } from './schemas/sign5-status.schema';
import { Sign5Award, Sign5AwardSchema } from './schemas/sign5-award.schema';

// We query users for direct referral counts
import { User, UserSchema } from '../users/schemas/user.schema';

// We post to wallet
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    WalletModule,
    MongooseModule.forFeature([
      { name: Sign5Status.name, schema: Sign5StatusSchema },
      { name: Sign5Award.name, schema: Sign5AwardSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [Sign5Controller],
  providers: [Sign5Service],
  exports: [Sign5Service],
})
export class Sign5Module {}