import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { LeadershipService } from './leadership.service';
import { EvaluateLeadershipDto } from './dto/evaluate-leadership.dto';

@Controller('leadership')
@UseGuards(JwtAuthGuard)
export class LeadershipController {
  constructor(private readonly leadershipService: LeadershipService) {}
  // Every end of the month
  @Post('evaluate')
  evaluate(@Body() dto: EvaluateLeadershipDto) {
    return this.leadershipService.evaluate(dto.userId, dto.monthKey, dto.asOfDateIso);
  }

  @Get('status/:userId')
  status(@Param('userId') userId: string, @Query('monthKey') monthKey: string) {
    return this.leadershipService.getStatus(userId, monthKey);
  }
}