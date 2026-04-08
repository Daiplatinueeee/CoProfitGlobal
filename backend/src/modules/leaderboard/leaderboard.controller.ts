import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * GET /leaderboard?sortBy=earnings&limit=50
   * Returns ranked list of users sorted by earnings or referrals.
   */
  @Get()
  getLeaderboard(
    @Query('sortBy') sortBy?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedSortBy: 'earnings' | 'referrals' =
      sortBy === 'referrals' ? 'referrals' : 'earnings';
    const resolvedLimit = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;
    return this.leaderboardService.getLeaderboard(resolvedSortBy, resolvedLimit);
  }
}
