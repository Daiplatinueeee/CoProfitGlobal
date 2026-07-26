import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import {
  ForgotPasswordRequest,
  ForgotPasswordRequestSchema,
} from './schemas/forgot-password-request.schema';

@Module({
  exports: [MongooseModule],
  imports: [
    UsersModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: ForgotPasswordRequest.name, schema: ForgotPasswordRequestSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Backs the ThrottlerGuard applied to POST /auth/login only (see
    // auth.controller.ts) — 5 attempts/minute per IP against credential
    // brute-forcing. Not registered globally, so it has no effect on any
    // other route in the app.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is missing');

        const raw = config.get<string>('JWT_EXPIRES_IN') ?? '7d';
        const expiresIn: JwtSignOptions['expiresIn'] =
          /^\d+$/.test(raw) ? Number(raw) : (raw as JwtSignOptions['expiresIn']);

        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}