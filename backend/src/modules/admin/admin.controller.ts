import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AdminService } from './admin.service';

import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateTierDto } from './dto/admin-update-tier.dto';
import { AdminGeneratePinsDto } from './dto/admin-generate-pins.dto';
import { AdminGenerateUnilevelPinDto } from './dto/admin-generate-unilevel-pin.dto';
import { AdminUpgradePackageDto } from './dto/admin-upgrade-package.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

import { MembershipTier, SystemRole } from '../users/schemas/user.schema';
import { PinStatus } from '../product-pins/schema/product-pins.schema';
import { UnilevelPinStatus } from '../unilevel-products/schemas/unilevel-pin.schema';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Users ───────────────────────────────────────────────────────────────────

  @Post('users')
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('users')
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('users/:id/available-points')
  getAvailablePoints(@Param('id') id: string) {
    return this.adminService.getAvailablePoints(id);
  }

  @Patch('users/:id/leg-points')
  updateLegPoints(
    @Param('id') id: string,
    @Body() dto: { leftAvailablePoints?: number; rightAvailablePoints?: number },
  ) {
    return this.adminService.updateLegPoints(id, dto);
  }

  @Patch('users/:id/membership-tier')
  updateMembershipTier(
    @Param('id') id: string,
    @Body() dto: AdminUpdateTierDto,
  ) {
    return this.adminService.updateMembershipTier(id, dto);
  }

  @Post('users/:id/upgrade-package')
  upgradePackage(@Param('id') id: string, @Body() dto: AdminUpgradePackageDto) {
    return this.adminService.upgradePackage(id, dto.packagePin);
  }

  // ─── Package PINs (membership tier activation) ───────────────────────────────

  @Post('pins/generate')
  generatePins(@Req() req: any, @Body() dto: AdminGeneratePinsDto) {
    const adminId = req.user?.sub || req.user?.id;
    return this.adminService.generatePins(adminId, dto);
  }

  @Get('pins')
  listPins(
    @Query('tier') tier?: MembershipTier,
    @Query('status') status?: PinStatus,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listPins(tier, status, limit ? Number(limit) : 50);
  }

  @Patch('pins/:id/void')
  voidPin(@Param('id') id: string) {
    return this.adminService.voidPin(id);
  }

  // ─── Unilevel PINs (product redemption) ──────────────────────────────────────

  @Post('unilevel-pins/generate')
  generateUnilevelPins(@Req() req: any, @Body() dto: AdminGenerateUnilevelPinDto) {
    const adminId = req.user?.sub || req.user?.id;
    return this.adminService.generateUnilevelPins(adminId, dto);
  }

  @Get('unilevel-pins')
  listUnilevelPins(
    @Query('status') status?: UnilevelPinStatus,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUnilevelPins(
      status,
      limit ? Number(limit) : 50,
    );
  }

  @Delete('unilevel-pins/:id')
  deleteUnilevelPin(@Param('id') id: string) {
    return this.adminService.deleteUnilevelPin(id);
  }
}