import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { VolumeService } from './volume.service'
import { MembershipTier } from '../users/schemas/user.schema'

@Controller('volume')
export class VolumeController {
  constructor(private readonly volumeService: VolumeService) {}

  @Post('activation')
  awardActivation(@Body() body: { memberUserId: string }) {
    return this.volumeService.awardActivationVolume(body.memberUserId)
  }

  @Post('upgrade')
  awardUpgrade(
    @Body()
    body: {
      userId: string
      oldTier: MembershipTier
      newTier: MembershipTier
    },
  ) {
    return this.volumeService.awardUpgradeVolume(
      body.userId,
      body.oldTier,
      body.newTier,
    )
  }

  @Get('summary/:userId')
  getSummary(@Param('userId') userId: string) {
    return this.volumeService.getVolumeSummary(userId)
  }
}