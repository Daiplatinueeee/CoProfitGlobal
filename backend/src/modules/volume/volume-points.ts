import { MembershipTier } from '../users/schemas/user.schema'

export const MEMBERSHIP_TIER_POINTS: Record<MembershipTier, number> = {
  [MembershipTier.FREE]: 0,
  [MembershipTier.BRONZE]: 1,
  [MembershipTier.SILVER]: 3,
  [MembershipTier.GOLD]: 5,
  [MembershipTier.PLATINUM]: 7,
}