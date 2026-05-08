import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class SignUpDto {
  @IsString()
  name: string;

  @Transform(({ value }) => value?.trim?.() ?? value)
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'email must be a valid email address' })
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  // optional referral code when signing up with ref
  @IsOptional()
  @IsString()
  sponsorReferralCode?: string;
}