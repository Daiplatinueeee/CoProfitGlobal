import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateProductPinDto {
  @IsNumber()
  @Min(0)
  pv: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;

  @IsString()
  @IsOptional()
  note?: string;
}
