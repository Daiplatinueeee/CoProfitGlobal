export class LeaderboardEntryDto {
  rank: number;
  userId: string;
  name: string;
  username: string;
  avatar: string | null;
  membershipTier: string;
  earnings: number;
  referrals: number;
}
