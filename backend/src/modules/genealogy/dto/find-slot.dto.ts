import { IsEnum, IsMongoId } from 'class-validator';
import { GenealogySide } from '../schema/genealogy-node.schema';

export class FindSlotDto {
  @IsMongoId()
  sponsorId: string;

  @IsEnum(GenealogySide)
  preferredSide: GenealogySide;
}