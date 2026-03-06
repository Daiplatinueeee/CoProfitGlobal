import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GenealogyService } from './genealogy.service';
import { PlaceMemberDto } from './dto/place-member.dto';
import { FindSlotDto } from './dto/find-slot.dto';

@Controller('genealogy')
export class GenealogyController {
  constructor(private readonly genealogyService: GenealogyService) {}

  // bootstrap first/root member manually
  @Post('root/:userId')
  createRoot(@Param('userId') userId: string) {
    return this.genealogyService.createRoot(userId);
  }

  // preview slot resolution before actual placement
  @Post('find-slot')
  findSlot(@Body() dto: FindSlotDto) {
    return this.genealogyService.findAvailableSlot(dto);
  }

  // consumes pin + activates + places
  @Post('place')
  placeMember(@Body() dto: PlaceMemberDto) {
    return this.genealogyService.placeMember(dto);
  }

  @Get('node/:userId')
  getNode(@Param('userId') userId: string) {
    return this.genealogyService.getNode(userId);
  }

  @Get('node/:userId/children')
  getChildren(@Param('userId') userId: string) {
    return this.genealogyService.getChildren(userId);
  }

  @Get('node/:userId/upline')
  getUpline(@Param('userId') userId: string) {
    return this.genealogyService.getUpline(userId);
  }
}