import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { MaintenanceService } from './maintenance.service';
import { ConfigureMaintenanceDto } from './dto/configure-maintenance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SystemRole } from '../users/schemas/user.schema';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // Public and unauthenticated on purpose — the login page needs to show the
  // maintenance banner BEFORE anyone has a token.
  @Get('status')
  getStatus() {
    return this.maintenanceService.getStatus();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  getFull(@Req() req: any) {
    return this.maintenanceService.getStatus();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  configure(@Req() req: any, @Body() dto: ConfigureMaintenanceDto) {
    const adminId = req.user?.sub || req.user?.id;
    return this.maintenanceService.configure(dto, adminId);
  }

  @Post('end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  endNow(@Req() req: any) {
    const adminId = req.user?.sub || req.user?.id;
    return this.maintenanceService.endNow(adminId);
  }
}
