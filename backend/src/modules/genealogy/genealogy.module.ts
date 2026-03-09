import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { GenealogyController } from './genealogy.controller'
import { GenealogyService } from './genealogy.service'
import {
  GenealogyNode,
  GenealogyNodeSchema,
} from './schema/genealogy-node.schema'
import { User, UserSchema } from '../users/schemas/user.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GenealogyNode.name, schema: GenealogyNodeSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [GenealogyController],
  providers: [GenealogyService],
  exports: [GenealogyService],
})
export class GenealogyModule {}