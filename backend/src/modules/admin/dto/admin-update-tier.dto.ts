import { IsEnum } from 'class-validator';
import { MembershipTier } from '../../users/schemas/user.schema';

export class AdminUpdateTierDto {
  @IsEnum(MembershipTier)
  membershipTier: MembershipTier;
}