import { IsString, IsNotEmpty } from 'class-validator';

export class RedeemRewardDto {
  @IsString()
  @IsNotEmpty()
  rewardId: string;
}
