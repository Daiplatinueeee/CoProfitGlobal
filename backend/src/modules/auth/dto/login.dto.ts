import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => value?.trim?.() ?? value)
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'email must be a valid email address' })
  email: string;

  @IsString()
  password: string;
}