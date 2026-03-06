import { IsMongoId } from 'class-validator';

export class ApplyActivationVolumeDto {
  @IsMongoId()
  activationId: string;
}