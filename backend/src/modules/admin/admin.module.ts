import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { UsersModule } from '../users/users.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  ProductPin,
  ProductPinSchema,
} from '../product-pins/schema/product-pins.schema';
import {
  VolumeBucket,
  VolumeBucketSchema,
} from '../volume/schemas/volume-bucket.schema';
import { RolesGuard } from '../auth/roles.guard';
import { PairingModule } from '../pairing/pairing.module';

@Module({
  imports: [
    UsersModule,
    PairingModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ProductPin.name, schema: ProductPinSchema },
      { name: VolumeBucket.name, schema: VolumeBucketSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}