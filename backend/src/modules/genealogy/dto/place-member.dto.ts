import { Type } from 'class-transformer'
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator'
import { GenealogySide } from '../schema/genealogy-node.schema'

export class PlaceMemberDto {
  @IsMongoId()
  parentUserId: string

  @IsEnum(GenealogySide)
  leg: GenealogySide

  // actual logged-in user who clicked add/place member
  @IsMongoId()
  placerUserId: string

  // ── New user fields ───────────────────────────────────────────────────────
  @IsString()
  @MinLength(2)
  name: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  username?: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string

  @IsString()
  @IsNotEmpty()
  packagePin: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(150)
  age?: number

  @IsOptional()
  @IsString()
  contact?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  beneficiary?: string

  @IsOptional()
  @IsDateString()
  birthday?: string
}