import { IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MembershipTier } from '../../users/schemas/user.schema';

export class AdminGeneratePinsDto {
  @IsEnum(MembershipTier)
  tier: MembershipTier;

  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)  
  quantity: number;
}