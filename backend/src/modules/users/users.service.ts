import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
  }): Promise<User> {
    try {
      const created = await this.userModel.create({
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role ?? UserRole.FREE,
      });

      // remove passwordHash from returned object (schema select:false already helps)
      return created;
    } catch (err: any) {
      // duplicate key error (email)
      if (err?.code === 11000) throw new ConflictException('Email already in use');
      throw err;
    }
  }

  async findByEmailWithPassword(email: string): Promise<(User & { passwordHash: string }) | null> {
    return this.userModel.findOne({ email }).select('+passwordHash').exec() as any;
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

   async findByIdWithRefreshSessions(userId: string) {
    return this.userModel
      .findById(userId)
      .select('+refreshSessions')
      .exec();
  }

  async addRefreshSession(params: {
    userId: string;
    sid: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }) {
    const user = await this.userModel.findById(params.userId).select('+refreshSessions').exec();
    if (!user) throw new NotFoundException('User not found');

    (user as any).refreshSessions.push({
      sid: params.sid,
      refreshTokenHash: params.refreshTokenHash,
      createdAt: new Date(),
      expiresAt: params.expiresAt,
      userAgent: params.userAgent,
      ip: params.ip,
    });

    await user.save();
  }

  async replaceRefreshSession(params: {
    userId: string;
    sid: string;
    newRefreshTokenHash: string;
    newExpiresAt: Date;
    userAgent?: string;
    ip?: string;
  }) {
    const user = await this.userModel.findById(params.userId).select('+refreshSessions').exec();
    if (!user) throw new NotFoundException('User not found');

    const sessions = (user as any).refreshSessions as any[];
    const idx = sessions.findIndex(s => s.sid === params.sid);
    if (idx === -1) return false;

    sessions[idx] = {
      ...sessions[idx],
      refreshTokenHash: params.newRefreshTokenHash,
      expiresAt: params.newExpiresAt,
      userAgent: params.userAgent ?? sessions[idx].userAgent,
      ip: params.ip ?? sessions[idx].ip,
    };

    await user.save();
    return true;
  }

  async removeRefreshSession(userId: string, sid: string) {
    const user = await this.userModel.findById(userId).select('+refreshSessions').exec();
    if (!user) return;

    (user as any).refreshSessions = ((user as any).refreshSessions as any[]).filter(s => s.sid !== sid);
    await user.save();
  }

  async removeAllRefreshSessions(userId: string) {
    const user = await this.userModel.findById(userId).select('+refreshSessions').exec();
    if (!user) return;

    (user as any).refreshSessions = [];
    await user.save();
  }
}