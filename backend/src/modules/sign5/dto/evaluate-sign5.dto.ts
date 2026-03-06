import { IsMongoId, IsOptional, IsString, Matches } from 'class-validator';

export class EvaluateSign5Dto {
  @IsMongoId()
  userId: string;

  // YYYY-MM (optional; defaults to current month)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  monthKey?: string;
}