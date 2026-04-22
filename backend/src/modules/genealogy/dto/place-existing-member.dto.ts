import { IsEnum, IsMongoId } from 'class-validator'
import { GenealogySide } from '../schema/genealogy-node.schema'

export class PlaceExistingMemberDto {
  @IsMongoId()
  parentUserId: string

  @IsEnum(GenealogySide)
  leg: GenealogySide

  /** The logged-in user who is performing the placement — becomes the sponsorId */
  @IsMongoId()
  placerUserId: string

  /** The already-existing user to place in the tree */
  @IsMongoId()
  existingMemberId: string
}
