import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UnilevelPvDeductionDocument = UnilevelPvDeduction & Document;

@Schema({ timestamps: true, collection: 'unilevel_pv_deductions' })
export class UnilevelPvDeduction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  pvConsumed: number;

  @Prop({ type: String, default: 'repeat_binary' })
  source: string;

  @Prop({ type: String, default: '' })
  refKey: string;
}

export const UnilevelPvDeductionSchema = SchemaFactory.createForClass(UnilevelPvDeduction);
