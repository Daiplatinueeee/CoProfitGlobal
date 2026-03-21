import { IsEnum, IsMongoId, IsString } from 'class-validator'
import { GenealogySide } from '../schema/genealogy-node.schema'

export class PlaceMemberDto {
  @IsMongoId()
  parentUserId: string

  @IsEnum(GenealogySide)
  leg: GenealogySide

  @IsString()
  username: string

  // actual logged-in user who clicked add/place member
  @IsMongoId()
  placerUserId: string
}