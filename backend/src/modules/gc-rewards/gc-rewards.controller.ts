import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SystemRole } from '../users/schemas/user.schema';

import { GcRewardsService } from './gc-rewards.service';
import { RedeemGcRewardDto } from './dto/redeem-gc-reward.dto';

@Controller('gc-rewards')
@UseGuards(JwtAuthGuard)
export class GcRewardsController {
  constructor(private readonly service: GcRewardsService) {}

  /** GET /gc-rewards/levels — the 8 reward levels and their GC cost */
  @Get('levels')
  levels() {
    return this.service.getLevels();
  }

  /** GET /gc-rewards/my/status — current GC balance + levels */
  @Get('my/status')
  status(@Request() req: any) {
    return this.service.getMyStatus(req.user.sub);
  }

  /** GET /gc-rewards/my/history — the requesting user's redeemed coupons */
  @Get('my/history')
  history(@Request() req: any) {
    return this.service.getMyHistory(req.user.sub);
  }

  /** POST /gc-rewards/redeem — debit GC and issue a coupon for a level */
  @Post('redeem')
  redeem(@Request() req: any, @Body() dto: RedeemGcRewardDto) {
    return this.service.redeem(req.user.sub, dto);
  }

  /** GET /gc-rewards/admin/redemptions — all GC redemptions (admin) */
  @Get('admin/redemptions')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  allRedemptions() {
    return this.service.getAllRedemptions();
  }
}
