import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PairingCycle } from '../pairing.service';

export class RunPairingDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsEnum(PairingCycle)
  cycle?: PairingCycle; // defaults to AM if not provided

  @IsOptional()
  @IsString()
  dateKey?: string; // YYYY-MM-DD, defaults to today
}