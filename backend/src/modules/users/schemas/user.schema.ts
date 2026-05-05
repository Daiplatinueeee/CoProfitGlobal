import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as crypto from 'crypto';

export type UserDocument = HydratedDocument<User>;

export enum MembershipTier {
  FREE = 'free',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

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

export const RefreshSessionSchema = SchemaFactory.createForClass(RefreshSession);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

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

  // ✅ packagePin is stored as plain text (e.g. "AB1234").
  // It is a reference to a ProductPin document — never hash it.
  @Prop({ required: true, unique: true, index: true, trim: true })
  packagePin: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  sponsorId: Types.ObjectId | null;

  @Prop({ type: [Number], default: [] })
  countedIndirectDepths: number[];

  @Prop({ default: '' })
  profileImage: string;

  @Prop({ type: Number, default: 0 })
  leftLegPoints: number;

  @Prop({ type: Number, default: 0 })
  rightLegPoints: number;

  // Counts pairs since last GC award (1–5); resets to 0 after GC is credited
  @Prop({ type: Number, default: 0 })
  gcPairingCounter: number;

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

  @Prop({ type: Date, default: null })
  tierUpgradedAt?: Date | null;

  @Prop({ type: Boolean, default: false })
  isFree: boolean;

  @Prop({ type: Number, default: 0 })
  totalPairingBonus: number;

  @Prop({ type: Number, default: 0 })
  totalSign5Bonus: number;

  @Prop({ type: Number, default: 0 })
  totalLeadershipBonus: number;

  @Prop({ type: Number, default: 0 })
  totalDirectReferralIncome: number;

  @Prop({ type: Number, default: 0 })
  totalIndirectReferralIncome: number;

  @Prop({ type: Number, default: 0 })
  totalRepeatBinaryBonusIncome: number;

  @Prop({ type: Number, default: 0 })
  totalStairstepBonusIncome: number;

  @Prop({ type: Number, default: 0 })
  totalRoyaltyBonusIncome: number;

  @Prop({ type: Number, default: 0 })
  unilevelPoints: number;

  @Prop({ type: [RefreshSessionSchema], default: [], select: false })
  refreshSessions: RefreshSession[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Auto-generate referralCode and username if missing.
// ⚠️  Only referralCode uses crypto here — packagePin is NEVER touched/hashed.
UserSchema.pre('validate', function (this: any) {
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(6).toString('base64url').slice(0, 8);
  }

  if (!this.username && this.name) {
    this.username = this.name;
  }

  // Safety guard: packagePin must be plain text (e.g. "AB1234"), never a bcrypt hash.
  if (this.packagePin && this.packagePin.startsWith('$2')) {
    throw new Error(
      'packagePin must be a plain-text PIN (e.g. AB1234), not a bcrypt hash. ' +
      'Do not hash packagePin before saving — store it as-is from the ProductPin record.',
    );
  }
});