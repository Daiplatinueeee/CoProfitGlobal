import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { WalletService } from './wallet.service';
import { CreditDto } from './dto/credit.dto';
import { DebitDto } from './dto/debit.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get(':userId/balances')
  balances(@Param('userId') userId: string) {
    return this.walletService.getBalances(userId);
  }

  @Get(':userId/income-summary')
  incomeSummary(@Param('userId') userId: string) {
    return this.walletService.getIncomeSummary(userId);
  }

  @Get(':userId/transactions')
  transactions(@Param('userId') userId: string, @Query('limit') limit?: string) {
    return this.walletService.getTransactions(userId, limit ? Number(limit) : 50);
  }

  @Post('credit')
  credit(@Body() dto: CreditDto) {
    return this.walletService.credit(dto);
  }

  @Post('debit')
  debit(@Body() dto: DebitDto) {
    return this.walletService.debit(dto);
  }
}