import { IsEnum, IsMongoId, IsString, Length } from 'class-validator';
import { GenealogySide } from '../../genealogy/schema/genealogy-node.schema';

export class ActivateMemberDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  sponsorId: string;

  @IsEnum(GenealogySide)
  preferredSide: GenealogySide;

  // raw 4-digit pin
  @IsString()
  @Length(4, 4)
  productPin: string;
}