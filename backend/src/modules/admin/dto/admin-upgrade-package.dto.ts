import { IsString, IsNotEmpty } from 'class-validator';

export class AdminUpgradePackageDto {
  @IsString()
  @IsNotEmpty()
  packagePin: string;
}