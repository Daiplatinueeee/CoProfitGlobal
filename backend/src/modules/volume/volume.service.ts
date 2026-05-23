import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import {
  User,
  UserDocument,
  MembershipTier,
} from '../users/schemas/user.schema'

import {
  GenealogyNode,
  GenealogyNodeDocument,
} from '../genealogy/schema/genealogy-node.schema'

import {
  VolumeBucket,
  VolumeBucketDocument,
  VolumeLeg,
} from './schemas/volume-bucket.schema'

import {
  VolumeLedger,
  VolumeLedgerDocument,
} from './schemas/volume-ledger.schema'

import { MEMBERSHIP_TIER_POINTS } from './volume-points'
import { PairingService } from '../pairing/pairing.service'

@Injectable()
export class VolumeService {
  private readonly logger = new Logger(VolumeService.name)

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(GenealogyNode.name)
    private readonly genealogyModel: Model<GenealogyNodeDocument>,

    @InjectModel(VolumeBucket.name)
    private readonly volumeBucketModel: Model<VolumeBucketDocument>,

    @InjectModel(VolumeLedger.name)
    private readonly volumeLedgerModel: Model<VolumeLedgerDocument>,

    private readonly pairingService: PairingService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id)
  }

  private toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id)
  }

  private getTierPoints(tier: MembershipTier): number {
    const points = MEMBERSHIP_TIER_POINTS[tier]
    if (points == null) {
      throw new BadRequestException(`No points configured for tier: ${tier}`)
    }
    return points
  }

  // ── Core ─────────────────────────────────────────────────────────────────

  /**
   * Credits volume points to every ancestor of the source user, then
   * immediately attempts auto-pairing for each ancestor.
   *
   * IMPORTANT — ancestors are processed SEQUENTIALLY (not in parallel).
   * Parallel processing caused a race condition where:
   *   1. Two simultaneous activations (left + right subtrees) could both
   *      trigger tryPairIfPossible for the same ancestor before either had
   *      flushed the bucket, resulting in double payouts.
   *   2. The pairing trigger for ancestor[i] could read stale bucket data
   *      if ancestor[i+1]'s credit had not yet committed to the DB.
   *
   * Sequential processing means: credit ancestor[0] → pair → credit
   * ancestor[1] → pair → … so each pairing always sees the freshest bucket.
   *
   * Within each ancestor step, the three DB writes (bucket, user leg field,
   * ledger) are still done in parallel because they are independent of each
   * other and don't affect the pairing read.
   */
  private async creditVolumeToUplines(params: {
    sourceUserId: string
    points: number
    membershipTier: MembershipTier
    reason: string
    eventKey: string
  }) {
    const { sourceUserId, points, membershipTier, reason, eventKey } = params

    this.logger.log(
      `[volume] creditVolumeToUplines — sourceUserId=${sourceUserId} points=${points} eventKey=${eventKey}`,
    )

    if (!this.isValidObjectId(sourceUserId)) {
      throw new BadRequestException('Invalid sourceUserId')
    }

    if (points <= 0) {
      this.logger.warn(`[volume] Skipping — points=${points} is not positive`)
      return {
        sourceUserId,
        points,
        membershipTier,
        awardedTo: [],
        skipped: true,
        message: 'No positive points to award',
      }
    }

    // ── Resolve source genealogy node ─────────────────────────────────
    const sourceNode = await this.genealogyModel
      .findOne({ userId: this.toObjectId(sourceUserId) })
      .lean()

    if (!sourceNode) {
      throw new NotFoundException('Source genealogy node not found')
    }

    const ancestorIds = (sourceNode.ancestors ?? []).map((id: any) =>
      id.toString(),
    )

    this.logger.log(
      `[volume] Found ${ancestorIds.length} ancestor(s) for source=${sourceUserId}`,
    )

    if (ancestorIds.length === 0) {
      return {
        sourceUserId,
        points,
        membershipTier,
        awardedTo: [],
        skipped: false,
        message: 'Source user has no uplines',
      }
    }

    // ── Fetch all ancestor genealogy nodes in one query ───────────────
    const ancestorNodes = await this.genealogyModel
      .find({
        userId: { $in: ancestorIds.map((id) => this.toObjectId(id)) },
      })
      .lean()

    const ancestorNodeMap = new Map(
      ancestorNodes.map((node: any) => [node.userId.toString(), node]),
    )

    // fullPath = [root → ... → parent → sourceUser]
    const fullPath = [...ancestorIds, sourceUserId]

    const awardedTo: Array<{
      ownerUserId: string
      leg: VolumeLeg
      points: number
    }> = []

    // ── Credit each ancestor SEQUENTIALLY ────────────────────────────
    //
    // Sequential (not parallel) so that:
    //  a) Each ancestor's bucket is fully written before its pairing check runs
    //  b) No two concurrent tryPairIfPossible calls race on the same bucket
    //
    // The three writes per ancestor (bucket / user-field / ledger) remain
    // parallel because they are independent of one another.
    for (let i = 0; i < fullPath.length - 1; i++) {
      const ancestorUserId   = fullPath[i]
      const nextUserIdInPath = fullPath[i + 1]
      const ancestorObjId    = this.toObjectId(ancestorUserId)

      // ── Idempotency: skip if already credited for this event ────────
      const alreadyDone = await this.volumeLedgerModel.exists({
        eventKey,
        ownerUserId: ancestorObjId,
      })
      if (alreadyDone) {
        this.logger.warn(
          `[volume] Ancestor=${ancestorUserId} already credited for eventKey=${eventKey}, skipping`,
        )
        continue
      }

      const ancestorNode: any = ancestorNodeMap.get(ancestorUserId)
      if (!ancestorNode) {
        this.logger.warn(
          `[volume] Ancestor node not found for userId=${ancestorUserId}, skipping`,
        )
        continue
      }

      // ── Resolve which leg the next node sits on ─────────────────────
      let leg: VolumeLeg | null = null

      if (
        ancestorNode.leftChildUserId &&
        ancestorNode.leftChildUserId.toString() === nextUserIdInPath
      ) {
        leg = VolumeLeg.LEFT
      } else if (
        ancestorNode.rightChildUserId &&
        ancestorNode.rightChildUserId.toString() === nextUserIdInPath
      ) {
        leg = VolumeLeg.RIGHT
      }

      if (!leg) {
        this.logger.error(
          `[volume] Could not resolve leg for ancestor=${ancestorUserId} toward source=${sourceUserId}, skipping`,
        )
        continue
      }

      this.logger.log(
        `[volume] Crediting ancestor=${ancestorUserId} leg=${leg} +${points}pts`,
      )

      // ── Write bucket + user leg field + ledger (parallel, independent) ─
      const [bucketUpdate] = await Promise.all([
        this.volumeBucketModel.updateOne(
          { ownerUserId: ancestorObjId, leg },
          { $inc: { totalPoints: points, availablePoints: points } },
          { upsert: true },
        ),
        this.userModel.updateOne(
          { _id: ancestorObjId },
          leg === VolumeLeg.LEFT
            ? { $inc: { leftLegPoints: points } }
            : { $inc: { rightLegPoints: points } },
        ),
        this.volumeLedgerModel.create({
          eventKey,
          ownerUserId:  ancestorObjId,
          sourceUserId: this.toObjectId(sourceUserId),
          leg,
          membershipTier,
          points,
          reason,
        }),
      ])

      this.logger.log(
        `[volume] Bucket update — matched=${bucketUpdate.matchedCount} ` +
        `modified=${bucketUpdate.modifiedCount} upserted=${bucketUpdate.upsertedCount}`,
      )

      awardedTo.push({ ownerUserId: ancestorUserId, leg, points })

      // ── Auto-pair: awaited so the next ancestor sees the flushed bucket ─
      //
      // Awaiting (instead of fire-and-forget) is critical here:
      //   - If this ancestor pairs and flushes both buckets to 0, the next
      //     ancestor's credit will start from a clean state.
      //   - Fire-and-forget would let the next ancestor's credit run
      //     before the bucket flush completes, causing stale reads.
      //
      // Errors are caught and logged but do NOT abort the credit chain —
      // volume crediting always completes even if pairing fails.
      try {
        const pairResult = await this.pairingService.tryPairIfPossible(ancestorUserId)

        if (pairResult.skipped) {
          this.logger.debug(
            `[volume] Auto-pair skipped for ${ancestorUserId} — ${pairResult.reason}`,
          )
        } else {
          this.logger.log(
            `[volume] Auto-pair SUCCESS for ${ancestorUserId} — ` +
            `pairings=${pairResult.pairingsMade} pts=${pairResult.totalPairedPoints} ` +
            `php=${pairResult.totalPayoutPhp} ` +
            `flushed L=${pairResult.leftFlushed} R=${pairResult.rightFlushed}`,
          )
        }
      } catch (err: any) {
        this.logger.error(
          `[volume] Auto-pair FAILED for ${ancestorUserId}: ${err.message}`,
        )
      }
    }

    this.logger.log(
      `[volume] creditVolumeToUplines complete — awardedTo=${awardedTo.length} ancestor(s)`,
    )

    return {
      sourceUserId,
      points,
      membershipTier,
      eventKey,
      awardedTo,
      skipped: false,
    }
  }

  // ── Public methods ────────────────────────────────────────────────────────

  async awardActivationVolume(memberUserId: string) {
    if (!this.isValidObjectId(memberUserId)) {
      throw new BadRequestException('Invalid memberUserId')
    }

    const user = await this.userModel.findById(memberUserId).lean()
    if (!user) throw new NotFoundException('User not found')

    if ((user as any).isFree) {
      this.logger.log(`[volume] awardActivationVolume — skipped for free account userId=${memberUserId}`)
      return { skipped: true, sourceUserId: memberUserId, points: 0, awardedTo: [] }
    }

    const points   = this.getTierPoints(user.membershipTier)
    const eventKey = `activation:${memberUserId}`

    this.logger.log(
      `[volume] awardActivationVolume — userId=${memberUserId} tier=${user.membershipTier} points=${points}`,
    )

    return this.creditVolumeToUplines({
      sourceUserId: memberUserId,
      points,
      membershipTier: user.membershipTier,
      reason: 'member_activation',
      eventKey,
    })
  }

  async awardUpgradeVolume(
    userId: string,
    oldTier: MembershipTier,
    newTier: MembershipTier,
  ) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const oldPoints = this.getTierPoints(oldTier)
    const newPoints = this.getTierPoints(newTier)
    const delta     = newPoints - oldPoints

    this.logger.log(
      `[volume] awardUpgradeVolume — userId=${userId} ${oldTier}(${oldPoints}pts) → ${newTier}(${newPoints}pts) delta=${delta}`,
    )

    if (delta <= 0) {
      return {
        userId,
        oldTier,
        newTier,
        delta,
        awardedTo: [],
        skipped: true,
        message: 'No upgrade delta to award',
      }
    }

    const eventKey = `upgrade:${userId}:${oldTier}->${newTier}`

    return this.creditVolumeToUplines({
      sourceUserId: userId,
      points: delta,
      membershipTier: newTier,
      reason: 'membership_upgrade_delta',
      eventKey,
    })
  }

  async getVolumeSummary(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const objectId = this.toObjectId(userId)

    const [user, buckets, ledger] = await Promise.all([
      this.userModel.findById(objectId).lean(),
      this.volumeBucketModel.find({ ownerUserId: objectId }).lean(),
      this.volumeLedgerModel
        .find({ ownerUserId: objectId })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
    ])

    if (!user) throw new NotFoundException('User not found')

    const leftBucket  = buckets.find((b) => b.leg === VolumeLeg.LEFT)
    const rightBucket = buckets.find((b) => b.leg === VolumeLeg.RIGHT)

    return {
      user: {
        id:             user._id.toString(),
        name:           user.name,
        username:       user.username,
        email:          user.email,
        role:           user.role,
        membershipTier: user.membershipTier,
      },
      legs: {
        left: {
          // totalPoints: lifetime accumulation, never decremented
          // availablePoints: current cycle balance — flushed to 0 on pairing
          userFieldPoints: user.leftLegPoints  ?? 0,
          totalPoints:     leftBucket?.totalPoints     ?? 0,
          availablePoints: leftBucket?.availablePoints ?? 0,
        },
        right: {
          userFieldPoints: user.rightLegPoints ?? 0,
          totalPoints:     rightBucket?.totalPoints     ?? 0,
          availablePoints: rightBucket?.availablePoints ?? 0,
        },
      },
      recentLedger: ledger,
    }
  }
}