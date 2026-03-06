import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PairingController } from './pairing.controller';
import { PairingService } from './pairing.service';

import { PairingState, PairingStateSchema } from './schemas/pairing-state.schema';
import { PairingAward, PairingAwardSchema } from './schemas/pairing-award.schema';

// read volume buckets
import { VolumeBucket, VolumeBucketSchema } from '../volume/schemas/volume-bucket.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PairingState.name, schema: PairingStateSchema },
      { name: PairingAward.name, schema: PairingAwardSchema },
      { name: VolumeBucket.name, schema: VolumeBucketSchema },
    ]),
  ],
  controllers: [PairingController],
  providers: [PairingService],
  exports: [PairingService],
})
export class PairingModule {}