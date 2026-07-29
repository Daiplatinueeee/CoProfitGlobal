import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfigureMaintenanceDto {
  @IsBoolean()
  isEnabled: boolean;

  // Omit or null = takes effect immediately once isEnabled is true.
  @IsOptional()
  @IsISO8601()
  startAt?: string | null;

  // Omit or null = indefinite, stays on until manually turned off.
  @IsOptional()
  @IsISO8601()
  endAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
