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
  @Prop({ required: true })
  sid: string;

  @Prop({ required: true, select: false })
  refreshTokenHash: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  userAgent?: string;

  @Prop()
  ip?: string;
}

export const RefreshSessionSchema =
  SchemaFactory.createForClass(RefreshSession);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  // added for genealogy/frontend compatibility
  @Prop({ required: true, trim: true, index: true })
  username: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
    index: true,
  })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({
    type: String,
    enum: Object.values(SystemRole),
    default: SystemRole.USER,
    index: true,
  })
  role: SystemRole;

  @Prop({
    type: String,
    enum: Object.values(MembershipTier),
    default: MembershipTier.BRONZE,
    index: true,
  })
  membershipTier: MembershipTier;

  @Prop({ required: true, unique: true, index: true, trim: true })
  referralCode: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  packagePin: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  sponsorId: Types.ObjectId | null;

  // added for genealogy/frontend compatibility
  @Prop({ default: '' })
  profileImage: string;

  @Prop({ type: Number, default: 0 })
  leftLegPoints: number;

  @Prop({ type: Number, default: 0 })
  rightLegPoints: number;

  @Prop({ type: Number, default: null })
  age?: number | null;

  @Prop({ default: '' })
  contact?: string;

  @Prop({ default: '' })
  address?: string;

  @Prop({ default: '' })
  beneficiary?: string;

  @Prop({ default: '' })
  birthday?: string;

  @Prop({ type: [RefreshSessionSchema], default: [], select: false })
  refreshSessions: RefreshSession[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Auto-generate referralCode if missing
UserSchema.pre('validate', function (this: any) {
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(6).toString('base64url').slice(0, 8);
  }

  if (!this.username && this.name) {
    this.username = this.name;
  }
});
