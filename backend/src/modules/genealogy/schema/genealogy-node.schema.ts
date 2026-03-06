import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GenealogyNodeDocument = HydratedDocument<GenealogyNode>;

export enum GenealogySide {
  LEFT = 'left',
  RIGHT = 'right',
}

@Schema({ timestamps: true })
export class GenealogyNode {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  // Placement parent in the binary tree
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  parentUserId: Types.ObjectId | null;

  // The side this user occupies under parent
  @Prop({
    type: String,
    enum: Object.values(GenealogySide),
    default: null,
  })
  position: GenealogySide | null;

  // Optional denormalized sponsor for faster reads
  @Prop({ type: Types.ObjectId, ref: 'User', required: true})
  sponsorId: Types.ObjectId;

  // Fast slot checks
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  leftChildUserId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  rightChildUserId: Types.ObjectId | null;

  @Prop({ required: true, default: 0, index: true })
  depth: number;

  // Optional ancestor chain for future fast traversal
  @Prop({ type: [Types.ObjectId], default: [] })
  ancestors: Types.ObjectId[];

  // In your flow, placement = activation
  @Prop({ required: true, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Date, default: () => new Date() })
  activatedAt: Date;
}

export const GenealogyNodeSchema = SchemaFactory.createForClass(GenealogyNode);

GenealogyNodeSchema.index({ parentUserId: 1, position: 1 });
GenealogyNodeSchema.index({ sponsorId: 1 });