import { BadRequestException, Injectable } from '@nestjs/common';
import {
  dayKeyFromDate,
  leadershipWindowForMonth,
  monthKeyFromDate,
  monthRange,
  parseIsoDateOrNow,
} from './utils/period.util';

@Injectable()
export class PeriodsService {
  resolvePeriods(asOfIso?: string) {
    let asOf: Date;
    try {
      asOf = parseIsoDateOrNow(asOfIso);
    } catch {
      throw new BadRequestException('Invalid asOfIso');
    }

    const dayKey = dayKeyFromDate(asOf);
    const monthKey = monthKeyFromDate(asOf);

    const { windowStart, windowEnd } = leadershipWindowForMonth(monthKey);
    const { start: monthStart, end: monthEnd } = monthRange(monthKey);

    const inLeadershipWindow = asOf >= windowStart && asOf <= windowEnd;

    return {
      asOf,
      dayKey,
      monthKey,
      monthStart,
      monthEnd,
      leadershipWindow: { windowStart, windowEnd, inLeadershipWindow },
    };
  }
}