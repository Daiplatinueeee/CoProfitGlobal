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

  private async hasEventBeenProcessed(eventKey: string): Promise<boolean> {
    const existing = await this.volumeLedgerModel.exists({ eventKey })
    return !!existing
  }

  // ── Core ─────────────────────────────────────────────────────────────────

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

    // ── Idempotency guard ─────────────────────────────────────────────
    const alreadyProcessed = await this.hasEventBeenProcessed(eventKey)
    if (alreadyProcessed) {
      this.logger.warn(`[volume] Skipping — event already processed: ${eventKey}`)
      return {
        sourceUserId,
        points,
        membershipTier,
        awardedTo: [],
        skipped: true,
        message: `Event already processed: ${eventKey}`,
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

    // ── Credit only the immediate parent's bucket ────────────────────
    // Topline users (grandparent and above) receive leg points only when
    // a pairing happens below them (handled in PairingService), not from placements.
    const parentIndex = fullPath.length - 2
    if (parentIndex < 0) {
      return {
        sourceUserId,
        points,
        membershipTier,
        awardedTo: [],
        skipped: false,
        message: 'Source user has no parent to credit',
      }
    }

    {
      const i = parentIndex
      const ancestorUserId   = fullPath[i]
      const nextUserIdInPath = fullPath[i + 1]

      const ancestorNode: any = ancestorNodeMap.get(ancestorUserId)
      if (!ancestorNode) {
        this.logger.warn(`[volume] Ancestor node not found for userId=${ancestorUserId}, skipping`)
        return { sourceUserId, points, membershipTier, awardedTo, skipped: false, message: 'Parent node not found' }
      }

      // Determine which leg the next node sits on
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
        throw new BadRequestException(
          `Could not resolve leg for ancestor ${ancestorUserId} toward source ${sourceUserId}`,
        )
      }

      this.logger.log(
        `[volume] Crediting ancestor=${ancestorUserId} leg=${leg} +${points}pts`,
      )

      // ── Credit VolumeBucket ─────────────────────────────────────────
      const bucketUpdate = await this.volumeBucketModel.updateOne(
        {
          ownerUserId: this.toObjectId(ancestorUserId),
          leg,
        },
        {
          $inc: {
            totalPoints:     points,
            availablePoints: points,
          },
        },
        { upsert: true },
      )

      this.logger.log(
        `[volume] Bucket update — matched=${bucketUpdate.matchedCount} ` +
        `modified=${bucketUpdate.modifiedCount} upserted=${bucketUpdate.upsertedCount}`,
      )

      // ── Update user leg point fields ────────────────────────────────
      await this.userModel.updateOne(
        { _id: this.toObjectId(ancestorUserId) },
        leg === VolumeLeg.LEFT
          ? { $inc: { leftLegPoints: points } }
          : { $inc: { rightLegPoints: points } },
      )

      // ── Write ledger entry ──────────────────────────────────────────
      await this.volumeLedgerModel.create({
        eventKey,
        ownerUserId:  this.toObjectId(ancestorUserId),
        sourceUserId: this.toObjectId(sourceUserId),
        leg,
        membershipTier,
        points,
        reason,
      })

      awardedTo.push({ ownerUserId: ancestorUserId, leg, points })

      // ── 🔥 Trigger auto-pairing immediately ─────────────────────────
      // Fire-and-forget: pairing failure must never block the volume credit.
      this.logger.log(
        `[volume] Triggering auto-pair for ancestor=${ancestorUserId} after crediting ${leg} leg`,
      )

      this.pairingService
        .tryPairIfPossible(ancestorUserId)
        .then((result) => {
          if (result.skipped) {
            this.logger.debug(
              `[volume] Auto-pair skipped for ${ancestorUserId} — ${result.reason}`,
            )
          } else {
            this.logger.log(
              `[volume] Auto-pair SUCCESS for ${ancestorUserId} — ` +
              `pairings=${result.pairingsMade} pts=${result.totalPairedPoints} php=${result.totalPayoutPhp}`,
            )
          }
        })
        .catch((err) => {
          this.logger.error(
            `[volume] Auto-pair FAILED for ${ancestorUserId}: ${err.message}`,
          )
        })
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