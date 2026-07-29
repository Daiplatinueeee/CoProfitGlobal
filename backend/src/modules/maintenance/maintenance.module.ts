import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceMode, MaintenanceModeSchema } from './schemas/maintenance-mode.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaintenanceMode.name, schema: MaintenanceModeSchema },
    ]),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
