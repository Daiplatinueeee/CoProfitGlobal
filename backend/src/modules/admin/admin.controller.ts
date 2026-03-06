import {
  Body,
  Controller,
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

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { MembershipTier } from '../users/schemas/user.schema';
import { PinStatus } from '../product-pins/schema/product-pins.schema';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // -------------------------
  // CREATE USER
  // -------------------------
  @Post('users')
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  // -------------------------
  // UPDATE USER MEMBERSHIP
  // -------------------------
  @Patch('users/:id/membership-tier')
  updateMembershipTier(
    @Param('id') id: string,
    @Body() dto: AdminUpdateTierDto,
  ) {
    return this.adminService.updateMembershipTier(id, dto);
  }

  // -------------------------
  // GENERATE PRODUCT PINS
  // -------------------------
  @Post('pins/generate')
  generatePins(@Req() req: any, @Body() dto: AdminGeneratePinsDto) {
    const adminId = req.user?.sub || req.user?.id;
    return this.adminService.generatePins(adminId, dto);
  }

  // -------------------------
  // LIST PINS
  // -------------------------
  @Get('pins')
  listPins(
    @Query('tier') tier?: MembershipTier,
    @Query('status') status?: PinStatus,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listPins(
      tier,
      status,
      limit ? Number(limit) : 50,
    );
  }

  // -------------------------
  // VOID PIN
  // -------------------------
  @Patch('pins/:id/void')
  voidPin(@Param('id') id: string) {
    return this.adminService.voidPin(id);
  }
}