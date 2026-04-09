import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WithdrawalStatus } from './schemas/withdrawal-request.schema';

@Controller('withdrawal')
@UseGuards(JwtAuthGuard)
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  /**
   * POST /withdrawal
   * User submits a withdrawal request. userId taken from JWT.
   */
  @Post()
  submit(@Request() req: any, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalService.submitRequest(req.user.sub, dto);
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
   * GET /withdrawal/all?status=pending&currency=gc_points
   * Admin: list all withdrawal requests, optionally filtered by status and currency.
   */
  @Get('all')
  allRequests(@Query('status') status?: string, @Query('currency') currency?: string) {
    return this.withdrawalService.getAllRequests(
      status as WithdrawalStatus | undefined,
      currency as any,
    );
  }

  /**
   * PATCH /withdrawal/:id/approve
   * Admin: approve a pending request and debit wallet.
   */
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body('adminNote') adminNote?: string) {
    return this.withdrawalService.approve(id, adminNote);
  }

  /**
   * PATCH /withdrawal/:id/reject
   * Admin: reject a pending request.
   */
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body('adminNote') adminNote?: string) {
    return this.withdrawalService.reject(id, adminNote);
  }
}
