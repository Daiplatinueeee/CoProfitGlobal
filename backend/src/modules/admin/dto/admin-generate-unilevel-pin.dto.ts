// src/admin/dto/admin-generate-unilevel-pin.dto.ts
import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminGenerateUnilevelPinDto {
  @IsMongoId()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;

  @IsString()
  @IsOptional()
  note?: string;
}