import { IsOptional, IsString } from 'class-validator';

export class ApprovePurchaseDto {
  @IsString()
  @IsOptional()
  adminNote?: string;
}
