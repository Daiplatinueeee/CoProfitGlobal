import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';

import { ProductPinsModule } from './modules/product-pins/product-pins.module';
import { AdminModule } from './modules/admin/admin.module';
import { GenealogyModule } from './modules/genealogy/genealogy.module';
import { ActivationsModule } from './modules/activations/activations.module';
import { VolumeModule } from './modules/volume/volume.module';
import { PairingModule } from './modules/pairing/pairing.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { Sign5Module } from './modules/sign5/sign5.module';
import { LeadershipModule } from './modules/leadership/leadership.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { WithdrawalModule } from './modules/withdrawal/withdrawal.module';
import { PeriodsModule } from './modules/periods/periods.module';
import { UnilevelProductsModule } from './modules/unilevel-products/unilevel-products.module';

require('node:dns/promises').setServers(['1.1.1.1', '8.8.8.8']);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),

    UsersModule,
    AuthModule,
    ProfilesModule,

    ProductPinsModule,
    AdminModule,
    GenealogyModule,
    ActivationsModule,
    VolumeModule,
    PairingModule,
    WalletModule,
    Sign5Module,
    LeadershipModule,
    LeaderboardModule,
    WithdrawalModule,
    PeriodsModule,
    UnilevelProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}