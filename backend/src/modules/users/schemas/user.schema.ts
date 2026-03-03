import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  FREE = 'free',
  PREMIUM = 'premium',
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

const RefreshSessionSchema = SchemaFactory.createForClass(RefreshSession);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ enum: UserRole, default: UserRole.FREE })
  role: UserRole;

  // multiple devices/sessions supported
  @Prop({ type: [RefreshSessionSchema], default: [], select: false })
  refreshSessions: RefreshSession[];
}

export const UserSchema = SchemaFactory.createForClass(User);