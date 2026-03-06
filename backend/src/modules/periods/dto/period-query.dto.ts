import { IsOptional, IsString } from 'class-validator';

export class PeriodQueryDto {
  // optional ISO date string, e.g. "2026-03-06T10:00:00.000Z"
  @IsOptional()
  @IsString()
  asOfIso?: string;
}