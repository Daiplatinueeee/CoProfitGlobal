import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MembershipTier } from '../../users/schemas/user.schema';
import { GenealogySide } from '../../genealogy/schema/genealogy-node.schema';

export class ActivateMemberDto {
  @IsString()
  @IsNotEmpty()
  sponsorId: string;

  @IsString()
  @IsNotEmpty()
  parentUserId: string;

  @IsEnum(GenealogySide)
  leg: GenealogySide;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsString()
  @IsNotEmpty()
  referralCode: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  beneficiary?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEnum(MembershipTier)
  membershipTier?: MembershipTier;

  @IsOptional()
  @IsString()
  pinId?: string;
}