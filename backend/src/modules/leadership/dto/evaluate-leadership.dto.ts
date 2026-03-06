import { IsMongoId, IsOptional, IsString, Matches } from 'class-validator';

export class EvaluateLeadershipDto {
  @IsMongoId()
  userId: string;

  // YYYY-MM (optional; defaults to current month)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  monthKey?: string;

  // optional: override evaluation date (ISO string)
  // If not provided, uses now.
  @IsOptional()
  @IsString()
  asOfDateIso?: string;
}