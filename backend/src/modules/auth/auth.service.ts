import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { UsersService } from '../users/users.service';
import { MembershipTier, SystemRole } from '../users/schemas/user.schema';
import { MaintenanceService } from '../maintenance/maintenance.service';
import {
  ForgotPasswordRequest,
  ForgotPasswordRequestDocument,
} from './schemas/forgot-password-request.schema';

type AccessPayload = { sub: string; email: string; role: MembershipTier };
type RefreshPayload = { sub: string; sid: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly maintenanceService: MaintenanceService,
    @InjectModel(ForgotPasswordRequest.name)
    private readonly forgotPasswordRequestModel: Model<ForgotPasswordRequestDocument>,
  ) {}

  private getExpires(raw: string, fallback: string): JwtSignOptions['expiresIn'] {
    const v = (raw ?? fallback).trim();
    return /^\d+$/.test(v) ? Number(v) : (v as JwtSignOptions['expiresIn']);
  }

  private accessExpiresIn() {
    return this.getExpires(this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '', '15m');
  }
  private refreshExpiresIn() {
    return this.getExpires(this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '', '7d');
  }

  private async hashPassword(password: string) {
    const rounds = Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 10);
    return bcrypt.hash(password, rounds);
  }

  private async signAccessToken(payload: AccessPayload) {
    return this.jwt.signAsync(payload, { expiresIn: this.accessExpiresIn() });
  }

  private async signRefreshToken(payload: RefreshPayload) {
    return this.jwt.signAsync(payload, { expiresIn: this.refreshExpiresIn() });
  }

  // Hash refresh token before storing (so DB leak doesn't give valid tokens)
  private async hashRefreshToken(token: string) {
    const rounds = 10; // fixed ok; refresh tokens are random high-entropy already
    return bcrypt.hash(token, rounds);
  }

  private async verifyRefreshToken(token: string, tokenHash: string) {
    return bcrypt.compare(token, tokenHash);
  }

  private computeRefreshExpiryDate(): Date {
    // Only used for DB expiry; keep simple: parse numeric seconds if given, else default days
    // Recommended: keep config as "7d" and set DB expiry accordingly by days.
    const raw = (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d').trim();
    if (/^\d+$/.test(raw)) {
      const seconds = Number(raw);
      return new Date(Date.now() + seconds * 1000);
    }
    // supports d/h/m suffix; for "7d"
    const m = raw.match(/^(\d+)([dhm])$/i);
    if (!m) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const ms =
      unit === 'd' ? n * 24 * 60 * 60 * 1000 :
      unit === 'h' ? n * 60 * 60 * 1000 :
      n * 60 * 1000;
    return new Date(Date.now() + ms);
  }

  private makeSid() {
    return randomBytes(16).toString('hex'); // session id
  }

  private async buildAuthResponse(user: any) {
    const access_token = await this.signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      access_token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // returns { access_token, user } AND refresh token string (to be placed in httpOnly cookie)
  private async issueRefreshSession(user: any, meta?: { userAgent?: string; ip?: string }) {
    const sid = this.makeSid();
    const refresh_token = await this.signRefreshToken({ sub: user._id.toString(), sid });

    const refreshTokenHash = await this.hashRefreshToken(refresh_token);
    const expiresAt = this.computeRefreshExpiryDate();

    await this.usersService.addRefreshSession({
      userId: user._id.toString(),
      sid,
      refreshTokenHash,
      expiresAt,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    });

    return { sid, refresh_token };
  }

  async signup(
    input: {
      name: string;
      email: string;
      password: string;
      packagePin?: string;          // optional - auto-generated if omitted
      sponsorReferralCode?: string; // optional referral code
    },
    meta?: { userAgent?: string; ip?: string },
  ) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await this.hashPassword(input.password);

    const user = await this.usersService.createUser({
      name: input.name.trim(),
      email,
      passwordHash,
      packagePin: input.packagePin,
      sponsorReferralCode: input.sponsorReferralCode,
    });

    const { refresh_token } = await this.issueRefreshSession(user as any, meta);
    const body = await this.buildAuthResponse(user as any);

    return { body, refresh_token };
  }

  // Login shortcut for the seeded super-admin account — see scripts/seed-superadmin.ts.
  // LoginDto exempts this exact string from the email-format check.
  private static readonly SUPER_ADMIN_SHORTCUT = 'superadmin';
  private static readonly SUPER_ADMIN_EMAIL = 'superadmin@coprofitglobal.com';

  async login(input: { email: string; password: string }, meta?: { userAgent?: string; ip?: string }) {
    let email = input.email.trim().toLowerCase();
    if (email === AuthService.SUPER_ADMIN_SHORTCUT) {
      email = AuthService.SUPER_ADMIN_EMAIL;
    }
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(input.password, (user as any).passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if ((user as any).isRestricted) {
      const reason = (user as any).restrictedReason?.trim();
      throw new ForbiddenException(
        reason
          ? `Your account has been restricted: ${reason}`
          : 'Your account has been restricted. Please contact support.',
      );
    }

    // Maintenance-mode login lockout — only regular USER accounts are
    // blocked. ADMIN and SUPER_ADMIN can always sign in, so the team can
    // keep working (and SUPER_ADMIN specifically can manage/end the window).
    const role = (user as any).role;
    if (role !== SystemRole.SUPER_ADMIN && role !== SystemRole.ADMIN) {
      const maintenanceActive = await this.maintenanceService.isActiveNow();
      if (maintenanceActive) {
        const status = await this.maintenanceService.getStatus();
        throw new ForbiddenException(
          status.message?.trim() || 'The system is currently under maintenance. Please check back later.',
        );
      }
    }

    const { refresh_token } = await this.issueRefreshSession(user as any, meta);
    const body = await this.buildAuthResponse(user as any);

    return { body, refresh_token };
  }

  // ROTATION endpoint: takes current refresh token, validates it against DB hash, then replaces it with new one
  async refresh(currentRefreshToken: string, meta?: { userAgent?: string; ip?: string }) {
    let payload: RefreshPayload;

    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(currentRefreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findByIdWithRefreshSessions(payload.sub);
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    const sessions = (user as any).refreshSessions as any[];
    const session = sessions.find(s => s.sid === payload.sid);
    if (!session) throw new UnauthorizedException('Invalid refresh token');

    // check expiry in DB too (extra safety)
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.usersService.removeRefreshSession(payload.sub, payload.sid);
      throw new UnauthorizedException('Refresh token expired');
    }

    const ok = await this.verifyRefreshToken(currentRefreshToken, session.refreshTokenHash);
    if (!ok) {
      // token reuse attempt: someone has an old token (possible theft)
      // safest action: revoke all sessions
      await this.usersService.removeAllRefreshSessions(payload.sub);
      throw new UnauthorizedException('Refresh token reuse detected. Please login again.');
    }

    // rotate: mint new refresh token for same sid
    const newRefreshToken = await this.signRefreshToken({ sub: payload.sub, sid: payload.sid });
    const newHash = await this.hashRefreshToken(newRefreshToken);
    const newExpiresAt = this.computeRefreshExpiryDate();

    const replaced = await this.usersService.replaceRefreshSession({
      userId: payload.sub,
      sid: payload.sid,
      newRefreshTokenHash: newHash,
      newExpiresAt,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    });

    if (!replaced) throw new UnauthorizedException('Invalid refresh token');

    // new access token too
    const access_token = await this.signAccessToken({
      sub: (user as any)._id.toString(),
      email: (user as any).email,
      role: (user as any).role,
    });

    return {
      body: { access_token },
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: string, sid: string) {
    await this.usersService.removeRefreshSession(userId, sid);
  }

  async submitForgotPasswordRequest(reason: string, description: string) {
    if (!reason?.trim() || !description?.trim()) {
      throw new BadRequestException('reason and description are required');
    }
    const doc = await this.forgotPasswordRequestModel.create({ reason, description });
    return { message: 'Request submitted', id: doc._id };
  }
  
}