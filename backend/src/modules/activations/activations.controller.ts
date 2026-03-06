import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ActivationsService } from './activations.service';
import { ActivateMemberDto } from './dto/activate-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activations')
@UseGuards(JwtAuthGuard)
export class ActivationsController {
  constructor(private readonly activationsService: ActivationsService) {}

  // Frontend uses this to activate + place in one step
  @Post('activate-and-place')
  activateAndPlace(@Body() dto: ActivateMemberDto) {
    return this.activationsService.activateAndPlace(dto);
  }

  @Get('latest/:userId')
  latest(@Param('userId') userId: string) {
    return this.activationsService.getLatestActivation(userId);
  }
}