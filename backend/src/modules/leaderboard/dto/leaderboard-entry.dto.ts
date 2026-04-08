export class LeaderboardEntryDto {
  rank: number;
  name: string;
  username: string;
  avatar: string | null;
  membershipTier: string;
  earnings: number;
  referrals: number;
}
