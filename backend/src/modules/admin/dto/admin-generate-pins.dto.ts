import { IsEnum, IsInt, Min, Max, IsBoolean, IsOptional } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MembershipTier } from '../../users/schemas/user.schema';

export class AdminGeneratePinsDto {
  @IsEnum(MembershipTier)
  tier: MembershipTier;

  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  quantity: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
  isFree?: boolean;
}