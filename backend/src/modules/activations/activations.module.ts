import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ActivationsController } from './activations.controller';
import { ActivationsService } from './activations.service';

import { Activation, ActivationSchema } from './schemas/activation.schema';
import { GenealogyModule } from '../genealogy/genealogy.module';

@Module({
  imports: [
    // We need GenealogyService
    GenealogyModule,

    // Activation audit model
    MongooseModule.forFeature([{ name: Activation.name, schema: ActivationSchema }]),
  ],
  controllers: [ActivationsController],
  providers: [ActivationsService],
  exports: [ActivationsService],
})
export class ActivationsModule {}