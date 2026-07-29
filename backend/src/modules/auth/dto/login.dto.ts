import { Transform } from 'class-transformer';
import { IsString, Matches, ValidateIf } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => value?.trim?.() ?? value)
  @IsString()
  // "superadmin" is a login shortcut for the seeded super-admin account (see
  // AuthService.login(), which expands it to the real email) — exempt from
  // the email-format check so it isn't rejected before ever reaching there.
  @ValidateIf((o) => o.email?.trim().toLowerCase() !== 'superadmin')
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'email must be a valid email address' })
  email: string;

  @IsString()
  password: string;
}