import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { MembershipTier } from '../../users/schemas/user.schema';

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(MembershipTier)
  membershipTier?: MembershipTier;

  @IsOptional()
  @IsString()
  role?: string; // system role: 'admin' or 'user'
}