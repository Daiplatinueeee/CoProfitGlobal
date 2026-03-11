import { IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { GenealogySide } from '../schema/genealogy-node.schema'

export class PlaceMemberDto {
  @IsString()
  @IsNotEmpty()
  parentUserId: string

  @IsEnum(GenealogySide)
  leg: GenealogySide

  @IsString()
  @IsNotEmpty()
  username: string
}