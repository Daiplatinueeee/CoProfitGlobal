import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { Sign5Service } from './sign5.service';
import { EvaluateSign5Dto } from './dto/evaluate-sign5.dto';

@Controller('sign5')
@UseGuards(JwtAuthGuard)
export class Sign5Controller {
  constructor(private readonly sign5Service: Sign5Service) {}

  // Evaluate and award for a user for a month (defaults to current month)
  @Post('evaluate')
  evaluate(@Body() dto: EvaluateSign5Dto) {
    return this.sign5Service.evaluateForUser(dto.userId, dto.monthKey);
  }

  // Read status + awards for a user/month
  @Get('status/:userId')
  status(@Param('userId') userId: string, @Query('monthKey') monthKey: string) {
    return this.sign5Service.getStatus(userId, monthKey);
  }
}