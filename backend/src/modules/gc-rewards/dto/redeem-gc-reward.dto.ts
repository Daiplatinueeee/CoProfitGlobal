import { IsInt, Max, Min } from 'class-validator';

export class RedeemGcRewardDto {
  @IsInt()
  @Min(1)
  @Max(8)
  level: number;
}
