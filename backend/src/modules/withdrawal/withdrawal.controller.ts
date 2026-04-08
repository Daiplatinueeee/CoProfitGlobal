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
   * GET /withdrawal/my
   * Returns the current user's withdrawal history.
   */
  @Get('my')
  myWithdrawals(@Request() req: any) {
    return this.withdrawalService.getMyWithdrawals(req.user.sub);
  }

  /**
   * GET /withdrawal/all?status=pending
   * Admin: list all withdrawal requests, optionally filtered by status.
   */
  @Get('all')
  allRequests(@Query('status') status?: string) {
    return this.withdrawalService.getAllRequests(status as WithdrawalStatus | undefined);
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
