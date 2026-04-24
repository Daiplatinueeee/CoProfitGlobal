import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLifestyleRewardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  pointsCost: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsInt()
  @Min(0)
  stock: number;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
