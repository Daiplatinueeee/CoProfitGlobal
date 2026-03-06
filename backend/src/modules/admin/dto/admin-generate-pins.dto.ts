import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { MembershipTier } from '../../users/schemas/user.schema';

export class AdminGeneratePinsDto {
  @IsEnum(MembershipTier)
  tier: MembershipTier;

  @IsInt()
  @Min(1)
  @Max(500)
  quantity: number;
}