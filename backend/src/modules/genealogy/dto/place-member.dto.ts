import { IsEnum, IsMongoId, IsString, Length } from 'class-validator';
import { GenealogySide } from '../schema/genealogy-node.schema';

export class PlaceMemberDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  sponsorId: string;

  @IsEnum(GenealogySide)
  preferredSide: GenealogySide;

  // raw 4-digit pin entered by frontend
  @IsString()
  @Length(4, 4)
  productPin: string;
}