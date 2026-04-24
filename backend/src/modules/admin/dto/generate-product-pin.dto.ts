import { IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateProductPinDto {
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
