import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Activation, ActivationDocument } from '../activations/schemas/activation.schema';
import { VolumeEvent, VolumeEventDocument } from './schemas/volume-event.schema';
import { VolumeBucket, VolumeBucketDocument } from './schemas/volume-bucket.schema';

import { GenealogyNode, GenealogyNodeDocument, GenealogySide } from '../genealogy/schema/genealogy-node.schema';
import { MembershipTier } from '../users/schemas/user.schema';

@Injectable()
export class VolumeService {
  constructor(
    @InjectModel(Activation.name) private readonly activationModel: Model<ActivationDocument>,
    @InjectModel(VolumeEvent.name) private readonly volumeEventModel: Model<VolumeEventDocument>,
    @InjectModel(VolumeBucket.name) private readonly volumeBucketModel: Model<VolumeBucketDocument>,
    @InjectModel(GenealogyNode.name) private readonly genealogyModel: Model<GenealogyNodeDocument>,
  ) {}

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  /**
   * Decide your period granularity here:
   * - Daily: "YYYY-MM-DD" (good if pairing cap resets daily)
   * - Monthly: "YYYY-MM" (good if pairing cap resets monthly)
   *
   * For now we use DAILY.
   */
  private periodKeyFromDate(d: Date): string {
    return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  private sideFromUplineAndNext(
    uplineNode: GenealogyNodeDocument,
    nextDownlineUserId: Types.ObjectId,
  ): GenealogySide {
    if (uplineNode.leftChildUserId?.toString() === nextDownlineUserId.toString()) {
      return GenealogySide.LEFT;
    }
    if (uplineNode.rightChildUserId?.toString() === nextDownlineUserId.toString()) {
      return GenealogySide.RIGHT;
    }
    // If this happens, the ancestor chain or child pointers are inconsistent.
    throw new BadRequestException('Genealogy path mismatch (cannot resolve side)');
  }

  /**
   * Apply volume from a single activation to all uplines in the placement tree.
   *
   * Writes:
   * - VolumeEvent per upline (audit)
   * - VolumeBucket increments per upline per period (for pairing)
   */
  async applyActivationVolume(activationId: string) {
    const activation = await this.activationModel.findById(this.toObjectId(activationId)).lean();
    if (!activation) throw new NotFoundException('Activation not found');

    const sourceUserId = activation.userId.toString();

    // Find source genealogy node (must exist because your flow places on activation)
    const sourceNode = await this.genealogyModel.findOne({ userId: this.toObjectId(sourceUserId) });
    if (!sourceNode) throw new BadRequestException('Source user is not placed in genealogy');

    const ancestors = sourceNode.ancestors ?? [];
    if (ancestors.length === 0) {
      // Root user: no uplines to credit
      return {
        message: 'No uplines to credit (root user)',
        creditedUplines: 0,
        periodKey: this.periodKeyFromDate(activation.activatedAt),
      };
    }

    // Chain: [ancestor0, ancestor1, ..., parent, sourceUser]
    const chain: Types.ObjectId[] = [...ancestors, sourceNode.userId];

    // Fetch all ancestor nodes in one query for side resolution
    const ancestorNodes = await this.genealogyModel.find({ userId: { $in: ancestors } });
    const byUserId = new Map<string, GenealogyNodeDocument>();
    for (const n of ancestorNodes) byUserId.set(n.userId.toString(), n);

    const occurredAt = activation.activatedAt ?? new Date();
    const periodKey = this.periodKeyFromDate(occurredAt);

    const points = activation.points;
    const tier = activation.tier as MembershipTier;

    // Optional: idempotency check (avoid double-apply on same activation)
    const already = await this.volumeEventModel.exists({ activationId: activation._id });
    if (already) {
      return {
        message: 'Volume already applied for this activation',
        creditedUplines: 0,
        periodKey,
      };
    }

    let credited = 0;

    // For each ancestor i, the “next downline” on path is chain[i+1]
    for (let i = 0; i < ancestors.length; i++) {
      const uplineUserId = chain[i];       // ancestor at i
      const nextDownlineId = chain[i + 1]; // the child on the path to source

      const uplineNode = byUserId.get(uplineUserId.toString());
      if (!uplineNode) {
        throw new BadRequestException('Genealogy ancestor node missing');
      }

      const side = this.sideFromUplineAndNext(uplineNode, nextDownlineId);

      // 1) Write audit event
      await this.volumeEventModel.create({
        activationId: activation._id,
        sourceUserId: activation.userId,
        uplineUserId,
        side,
        tier,
        points,
        periodKey,
        occurredAt,
      });

      // 2) Upsert bucket and increment left/right
      const inc: any = side === GenealogySide.LEFT
        ? { leftPoints: points }
        : { rightPoints: points };

      await this.volumeBucketModel.updateOne(
        { userId: uplineUserId, periodKey },
        { $inc: inc, $setOnInsert: { userId: uplineUserId, periodKey, leftPoints: 0, rightPoints: 0 } },
        { upsert: true },
      );

      credited++;
    }

    return {
      message: 'Volume applied',
      activationId: activation._id.toString(),
      sourceUserId,
      tier,
      points,
      periodKey,
      creditedUplines: credited,
    };
  }

  async getBucket(userId: string, periodKey: string) {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');

    const row = await this.volumeBucketModel
      .findOne({ userId: this.toObjectId(userId), periodKey })
      .lean();

    return row
      ? {
          userId: row.userId.toString(),
          periodKey: row.periodKey,
          leftPoints: row.leftPoints,
          rightPoints: row.rightPoints,
        }
      : {
          userId,
          periodKey,
          leftPoints: 0,
          rightPoints: 0,
        };
  }
}