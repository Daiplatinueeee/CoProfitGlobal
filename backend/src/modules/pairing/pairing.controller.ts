import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PairingService, PairingCycle } from './pairing.service';
import { RunPairingDto } from './dto/run-pairing.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('pairing')
@UseGuards(JwtAuthGuard)
export class PairingController {
  constructor(private readonly pairingService: PairingService) {}

  /**
   * Manually trigger pairing for a user (admin / testing).
   * Body: { userId, cycle: 'AM' | 'PM', dateKey?: 'YYYY-MM-DD' }
   */
  @Post('run')
  run(@Body() dto: RunPairingDto) {
    const cycle = dto.cycle ?? PairingCycle.AM;
    return this.pairingService.runPairing(dto.userId, cycle, dto.dateKey);
  }

  /**
   * Get pairing state + award for a specific cycle.
   * periodKey format: YYYY-MM-DD-AM or YYYY-MM-DD-PM
   * Example: GET /pairing/state/:userId?periodKey=2026-03-29-AM
   */
  @Get('state/:userId')
  state(
    @Param('userId') userId: string,
    @Query('periodKey') periodKey: string,
  ) {
    return this.pairingService.getState(userId, periodKey);
  }

  /**
   * Get both AM and PM cycle states for a full day summary.
   * Example: GET /pairing/day/:userId?dateKey=2026-03-29
   */
  @Get('day/:userId')
  dayState(
    @Param('userId') userId: string,
    @Query('dateKey') dateKey: string,
  ) {
    return this.pairingService.getDayState(userId, dateKey);
  }

  /**
   * Get pairing history across all downlines of a user, newest first.
   * Example: GET /pairing/downline-history/:userId?limit=100
   */
  @Get('downline-history/:userId')
  downlineHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.pairingService.getDownlineHistory(userId, limit ? parseInt(limit, 10) : 100);
  }

  /**
   * Get full pairing history for a user, newest first.
   * Example: GET /pairing/history/:userId?limit=50
   */
  @Get('history/:userId')
  history(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.pairingService.getHistory(userId, limit ? parseInt(limit, 10) : 50);
  }
}