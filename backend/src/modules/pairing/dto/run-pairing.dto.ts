import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class RunPairingDto {
  @IsMongoId()
  userId: string;

  // optional: defaults to today "YYYY-MM-DD"
  @IsOptional()
  @IsString()
  periodKey?: string;
}