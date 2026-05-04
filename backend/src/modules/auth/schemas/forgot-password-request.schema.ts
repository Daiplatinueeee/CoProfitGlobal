import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ForgotPasswordRequestDocument = ForgotPasswordRequest & Document;

export enum ForgotPasswordRequestStatus {
  PENDING  = 'pending',
  RESOLVED = 'resolved',
}

@Schema({ timestamps: true })
export class ForgotPasswordRequest {
  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: ForgotPasswordRequestStatus.PENDING })
  status: ForgotPasswordRequestStatus;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  resolvedNote?: string;
}

export const ForgotPasswordRequestSchema = SchemaFactory.createForClass(ForgotPasswordRequest);
