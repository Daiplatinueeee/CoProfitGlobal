import { Body, Controller, Post, Req, Res, UseGuards, HttpCode } from '@nestjs/common';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
    const name = this.config.get<string>('REFRESH_COOKIE_NAME') ?? 'refresh_token';

    res.cookie(name, refreshToken, {
      httpOnly: true,
      secure: false,      // set true in production HTTPS
      sameSite: 'lax',    // consider 'none' if different domains + HTTPS
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // align with refresh expiry
    });
  }

  private clearRefreshCookie(res: Response) {
    const name = this.config.get<string>('REFRESH_COOKIE_NAME') ?? 'refresh_token';
    res.clearCookie(name, { path: '/auth/refresh' });
  }

  @Post('signup')
  async signup(@Body() dto: SignUpDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const meta = { userAgent: req.headers['user-agent'], ip: req.ip };
    const { body, refresh_token } = await this.auth.signup(dto, meta);
    this.setRefreshCookie(res, refresh_token);
    return body;
  }

  // Rate-limited to 5 attempts/minute per IP — protects against credential
  // brute-forcing. Only this route is guarded; other endpoints are
  // unaffected since ThrottlerGuard isn't registered globally.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const meta = { userAgent: req.headers['user-agent'], ip: req.ip };
    const { body, refresh_token } = await this.auth.login(dto, meta);
    this.setRefreshCookie(res, refresh_token);
    return body;
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const name = this.config.get<string>('REFRESH_COOKIE_NAME') ?? 'refresh_token';
    const current = (req as any).cookies?.[name];
    const meta = { userAgent: req.headers['user-agent'], ip: req.ip };

    const { body, refresh_token } = await this.auth.refresh(current, meta);
    this.setRefreshCookie(res, refresh_token);
    return body; // { access_token }
  }

  // Optional: logout current session
  // You need sid to logout specific session; simplest approach is to decode refresh token in refresh endpoint,
  // but here we’ll just clear cookie and revoke ALL sessions if you want.
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.auth['usersService'].removeAllRefreshSessions(req.user.sub);
    this.clearRefreshCookie(res);
    return { message: 'Logged out' };
  }

  @Post('forgot-password-request')
  @HttpCode(201)
  submitForgotPasswordRequest(
    @Body() body: { reason: string; description: string },
  ) {
    return this.auth.submitForgotPasswordRequest(body.reason, body.description);
  }
}