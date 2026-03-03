import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const rounds = Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 10);
    return bcrypt.hash(password, rounds);
  }

  private async signToken(payload: { sub: string; email: string; role: UserRole }) {
  const expiresIn = (this.config.get('JWT_EXPIRES_IN') ?? '7d') as JwtSignOptions['expiresIn'];
  return this.jwtService.signAsync(payload, { expiresIn });
}

  async signup(input: { name: string; email: string; password: string; role?: UserRole }) {
    const passwordHash = await this.hashPassword(input.password);

    const user = await this.usersService.createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    });

    const token = await this.signToken({
      sub: (user as any)._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      access_token: token,
      user: {
        id: (user as any)._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.usersService.findByEmailWithPassword(input.email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(input.password, (user as any).passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = await this.signToken({
      sub: (user as any)._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      access_token: token,
      user: {
        id: (user as any)._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}