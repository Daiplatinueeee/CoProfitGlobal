import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SystemRole } from '../users/schemas/user.schema';
import { WithdrawalStatus } from './schemas/withdrawal-request.schema';

@Controller('withdrawal')
@UseGuards(JwtAuthGuard)
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  /**
   * POST /withdrawal
   * User submits a withdrawal request. userId taken from JWT.
   * Each request is a separate transaction — requests cannot be edited afterwards.
   */
  @Post()
  submit(@Request() req: any, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalService.submitRequest(req.user.sub, dto);
  }

  /**
   * PATCH /withdrawal/:id/cancel
   * User cancels their own pending request and gets the amount refunded.
   */
  @Patch(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.withdrawalService.cancelRequest(req.user.sub, id);
  }

  /**
   * GET /withdrawal/my?currency=gc_points
   * Returns the current user's withdrawal history, optionally filtered by currency.
   */
  @Get('my')
  myWithdrawals(@Request() req: any, @Query('currency') currency?: string) {
    return this.withdrawalService.getMyWithdrawals(req.user.sub, currency as any);
  }

  /**
   * GET /withdrawal/all?status=pending&currency=gc_points&from=2026-10-01&to=2026-10-31
   * Admin: list all withdrawal requests, optionally filtered by status, currency and date range.
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  allRequests(
    @Query('status') status?: string,
    @Query('currency') currency?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.withdrawalService.getAllRequests(
      status as WithdrawalStatus | undefined,
      currency as any,
      from,
      to,
    );
  }

  /**
   * PATCH /withdrawal/:id/approve
   * Admin: approve a pending request (wallet was already debited at request time).
   */
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  approve(@Request() req: any, @Param('id') id: string, @Body('adminNote') adminNote?: string) {
    return this.withdrawalService.approve(id, req.user.sub, adminNote);
  }

  /**
   * PATCH /withdrawal/:id/reject
   * Admin: reject a pending request and refund the locked amount.
   */
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  reject(@Request() req: any, @Param('id') id: string, @Body('adminNote') adminNote?: string) {
    return this.withdrawalService.reject(id, req.user.sub, adminNote);
  }
}
