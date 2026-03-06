import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  // optional referral code when signing up with ref
  @IsOptional()
  @IsString()
  sponsorReferralCode?: string;
}