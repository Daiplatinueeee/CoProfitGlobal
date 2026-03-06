import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { VolumeController } from './volume.controller';
import { VolumeService } from './volume.service';

import { VolumeEvent, VolumeEventSchema } from './schemas/volume-event.schema';
import { VolumeBucket, VolumeBucketSchema } from './schemas/volume-bucket.schema';

// We inject the schemas we need directly to avoid circular imports
import { Activation, ActivationSchema } from '../activations/schemas/activation.schema';
import { GenealogyNode, GenealogyNodeSchema } from '../genealogy/schema/genealogy-node.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VolumeEvent.name, schema: VolumeEventSchema },
      { name: VolumeBucket.name, schema: VolumeBucketSchema },
      { name: Activation.name, schema: ActivationSchema },
      { name: GenealogyNode.name, schema: GenealogyNodeSchema },
    ]),
  ],
  controllers: [VolumeController],
  providers: [VolumeService],
  exports: [VolumeService],
})
export class VolumeModule {}