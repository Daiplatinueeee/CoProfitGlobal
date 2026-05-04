import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminRestrictUserDto {
  /** true = restrict the account, false = lift the restriction */
  @IsBoolean()
  isRestricted: boolean;

  /** Required when isRestricted is true; ignored (cleared) when lifting. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}