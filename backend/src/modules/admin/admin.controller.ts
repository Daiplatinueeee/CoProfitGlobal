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
import { GenerateProductPinDto } from './dto/generate-product-pin.dto';
import { AdminUpgradePackageDto } from './dto/admin-upgrade-package.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

import { MembershipTier, SystemRole } from '../users/schemas/user.schema';
import { PinStatus } from '../product-pins/schema/product-pins.schema';
import { UnilevelPinStatus } from '../unilevel-products/schemas/unilevel-pin.schema';
import { AdminRestrictUserDto } from './dto/admin-restrict-user.dto';

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
    @Body()
    dto: { leftAvailablePoints?: number; rightAvailablePoints?: number },
  ) {
    return this.adminService.updateLegPoints(id, dto);
  }

  @Patch('users/:id/bonuses')
  updateUserBonuses(
    @Param('id') id: string,
    @Body()
    dto: {
      totalPairingBonus?: number;
      totalSign5Bonus?: number;
      totalLeadershipBonus?: number;
      totalDirectReferralIncome?: number;
      totalIndirectReferralIncome?: number;
      totalRepeatBinaryBonusIncome?: number;
      totalStairstepBonusIncome?: number;
      totalRoyaltyBonusIncome?: number;
      unilevelPoints?: number;
    },
  ) {
    return this.adminService.updateBonuses(id, dto);
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

  @Delete('pins/bulk-delete')
  bulkDeletePackagePins(@Query('status') status: 'UNUSED' | 'USED') {
    return this.adminService.bulkDeletePackagePins(status);
  }

  // ─── Unilevel PINs (product redemption) ──────────────────────────────────────

  @Post('unilevel-pins/generate')
  generateUnilevelPins(
    @Req() req: any,
    @Body() dto: AdminGenerateUnilevelPinDto,
  ) {
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

  // ─── Product PIN aliases (used by frontend) ───────────────────────────────────

  @Post('product-pins/generate')
  generateProductPins(@Req() req: any, @Body() dto: GenerateProductPinDto) {
    const adminId = req.user?.sub || req.user?.id;
    return this.adminService.generateProductPins(adminId, dto);
  }

  @Get('product-pins')
  listProductPins(
    @Query('status') status?: UnilevelPinStatus,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUnilevelPins(
      status,
      limit ? Number(limit) : 200,
    );
  }

  @Delete('product-pins/bulk-delete')
  bulkDeleteProductPins(@Query('status') status: 'UNUSED' | 'USED') {
    return this.adminService.bulkDeleteProductPins(status);
  }

  // ─── Forgot-password requests ────────────────────────────────────────────────

  @Get('forgot-password-requests')
  listForgotPasswordRequests(@Query('status') status?: string) {
    return this.adminService.listForgotPasswordRequests(status);
  }

  @Patch('forgot-password-requests/:id/resolve')
  resolveForgotPasswordRequest(
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.adminService.resolveForgotPasswordRequest(id, body.note);
  }

  // ─── User password (admin override) ─────────────────────────────────────────

  @Patch('users/:id/password')
  changeUserPassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ) {
    return this.adminService.changeUserPassword(id, body.newPassword);
  }

  // ─── ADD THIS ENDPOINT to AdminController in admin.controller.ts ─────────────

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Patch('users/:id/restrict')
  restrictUser(@Param('id') id: string, @Body() dto: AdminRestrictUserDto) {
    return this.adminService.restrictUser(id, dto);
  }
}