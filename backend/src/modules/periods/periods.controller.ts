import { Controller, Get, Query } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { PeriodQueryDto } from './dto/period-query.dto';

@Controller('periods')
export class PeriodsController {
  constructor(private readonly periodsService: PeriodsService) {}

  // Returns standardized period keys used by other modules
  @Get('current')
  current(@Query() q: PeriodQueryDto) {
    return this.periodsService.resolvePeriods(q.asOfIso);
  }
}