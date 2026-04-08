import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { GenealogySide } from '../../genealogy/schema/genealogy-node.schema'

export class ActivateMemberDto {
  @IsString()
  @IsNotEmpty()
  sponsorId: string

  @IsString()
  @IsNotEmpty()
  parentUserId: string

  @IsString()
  @IsNotEmpty()
  placerUserId: string

  @IsEnum(GenealogySide)
  leg: GenealogySide

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
  @IsString()
  pinId?: string

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