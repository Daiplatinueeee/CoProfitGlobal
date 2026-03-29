import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'

import { VolumeService } from './volume.service'
import { VolumeController } from './volume.controller'

import { User, UserSchema } from '../users/schemas/user.schema'
import { GenealogyNode, GenealogyNodeSchema } from '../genealogy/schema/genealogy-node.schema'
import { VolumeBucket, VolumeBucketSchema } from './schemas/volume-bucket.schema'
import { VolumeLedger, VolumeLedgerSchema } from './schemas/volume-ledger.schema'

import { PairingModule } from '../pairing/pairing.module' // ← add

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: GenealogyNode.name, schema: GenealogyNodeSchema },
      { name: VolumeBucket.name, schema: VolumeBucketSchema },
      { name: VolumeLedger.name, schema: VolumeLedgerSchema },
    ]),
    PairingModule, // ← add
  ],
  controllers: [VolumeController],
  providers: [VolumeService],
  exports: [VolumeService],
})
export class VolumeModule {}