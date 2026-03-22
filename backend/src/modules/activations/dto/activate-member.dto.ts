import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'
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
  @IsNotEmpty()
  username: string

  @IsOptional()
  @IsString()
  pinId?: string
}