import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { VolumeService } from './volume.service';
import { ApplyActivationVolumeDto } from './dto/apply-activation-volume.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('volume')
@UseGuards(JwtAuthGuard)
export class VolumeController {
  constructor(private readonly volumeService: VolumeService) {}

  // Apply volume for one activation (call after activation+placement)
  @Post('apply-activation')
  applyActivation(@Body() dto: ApplyActivationVolumeDto) {
    return this.volumeService.applyActivationVolume(dto.activationId);
  }

  // Read totals for pairing
  @Get('bucket/:userId')
  getBucket(
    @Param('userId') userId: string,
    @Query('periodKey') periodKey: string,
  ) {
    return this.volumeService.getBucket(userId, periodKey);
  }

  // Gaw kani nga endpoint mo ket ni siya sa tibuok tree
  /*

  {
  "periodKey": "2026-03-10",
  "pointsMap": {
    "rootUserId": { "leftPoints": 10, "rightPoints": 10 },
    "leftMember1Id": { "leftPoints": 10, "rightPoints": 10 },
    "rightMember2Id": { "leftPoints": 15, "rightPoints": 15 }
  }
}
  
  */
  @Get('tree-buckets/:userId')
  getTreeBuckets(
  @Param('userId') userId: string,
  @Query('periodKey') periodKey: string,
) {
  return this.volumeService.getTreeBuckets(userId, periodKey)
}
}