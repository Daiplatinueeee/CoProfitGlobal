import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string; // 'php' (default) or 'gc_points'

  @IsOptional()
  @IsString()
  paymentMethod?: string; // Required only for PHP

  @IsOptional()
  @IsString()
  accountName?: string; // Required only for PHP

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
