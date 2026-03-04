// src/modules/users/schemas/user.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as crypto from 'crypto';

export type UserDocument = HydratedDocument<User>;

// Membership tiers (product/package tiers)
export enum MembershipTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

// System roles (authorization)
export enum SystemRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Schema({ _id: false })
export class RefreshSession {
  @Prop({ required: true }) // random id for this session
  sid: string;

  @Prop({ required: true, select: false }) // store HASHED refresh token
  refreshTokenHash: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop() // optional metadata
  userAgent?: string;

  @Prop()
  ip?: string;
}

export const RefreshSessionSchema = SchemaFactory.createForClass(RefreshSession);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  // ✅ NEW: system role for auth/guards
  @Prop({ type: String, enum: Object.values(SystemRole), default: SystemRole.USER, index: true })
  role: SystemRole;

  // Product/package tier
  @Prop({ type: String, enum: Object.values(MembershipTier), default: MembershipTier.BRONZE, index: true })
  membershipTier: MembershipTier;

  // Unique referral code for sponsor links
  @Prop({ required: true, unique: true, index: true })
  referralCode: string;

  // Sponsor (direct referrer)
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  sponsorId: Types.ObjectId | null;

  // multiple devices/sessions supported
  @Prop({ type: [RefreshSessionSchema], default: [], select: false })
  refreshSessions: RefreshSession[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Auto-generate referralCode if missing
UserSchema.pre('validate', function (this: any) {
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(6).toString('base64url').slice(0, 8);
  }
});