import { IsString, IsNotEmpty } from 'class-validator';

export class RedeemPinDto {
  @IsString()
  @IsNotEmpty()
  pin: string;
}
