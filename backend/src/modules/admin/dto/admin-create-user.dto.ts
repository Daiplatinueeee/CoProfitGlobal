import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MinLength,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import {
  MembershipTier,
  SystemRole,
} from '../../users/schemas/user.schema';

export class AdminCreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  username?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(150)
  age?: number;

  @IsString()
  contact?: string;

  @IsString()
  address?: string;

  @IsString()
  beneficiary?: string;

  @IsDateString()
  birthday?: string;

  @IsString()
  @IsNotEmpty()
  packagePin: string;

  @IsOptional()
  @IsEnum(MembershipTier)
  membershipTier?: MembershipTier;

  @IsEnum(SystemRole)
  role?: SystemRole;

  @IsOptional()
  @IsString()
  sponsorReferralCode?: string;
}