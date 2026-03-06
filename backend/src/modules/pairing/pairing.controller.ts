import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PairingService } from './pairing.service';
import { RunPairingDto } from './dto/run-pairing.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('pairing')
@UseGuards(JwtAuthGuard)
export class PairingController {
  constructor(private readonly pairingService: PairingService) {}

  // Run pairing for a user for a period (default today)
  @Post('run')
  run(@Body() dto: RunPairingDto) {
    return this.pairingService.runPairing(dto.userId, dto.periodKey);
  }

  // Read computed state/award
  @Get('state/:userId')
  state(
    @Param('userId') userId: string,
    @Query('periodKey') periodKey: string,
  ) {
    return this.pairingService.getState(userId, periodKey);
  }
}