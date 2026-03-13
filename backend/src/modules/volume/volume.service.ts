import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class VolumeService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(GenealogyNode.name)
    private readonly genealogyModel: Model<GenealogyNodeDocument>,

    @InjectModel(VolumeBucket.name)
    private readonly volumeBucketModel: Model<VolumeBucketDocument>,

    @InjectModel(VolumeLedger.name)
    private readonly volumeLedgerModel: Model<VolumeLedgerDocument>,
  ) {}

  private isValidObjectId(id: string) {
    return Types.ObjectId.isValid(id)
  }

  private toObjectId(id: string) {
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

  private async creditVolumeToUplines(params: {
    sourceUserId: string
    points: number
    membershipTier: MembershipTier
    reason: string
    eventKey: string
  }) {
    const { sourceUserId, points, membershipTier, reason, eventKey } = params

    if (!this.isValidObjectId(sourceUserId)) {
      throw new BadRequestException('Invalid sourceUserId')
    }

    if (points <= 0) {
      return {
        sourceUserId,
        points,
        membershipTier,
        awardedTo: [],
        skipped: true,
        message: 'No positive points to award',
      }
    }

    const alreadyProcessed = await this.hasEventBeenProcessed(eventKey)
    if (alreadyProcessed) {
      return {
        sourceUserId,
        points,
        membershipTier,
        awardedTo: [],
        skipped: true,
        message: `Event already processed: ${eventKey}`,
      }
    }

    const sourceNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(sourceUserId),
    }).lean()

    if (!sourceNode) {
      throw new NotFoundException('Source genealogy node not found')
    }

    const ancestorIds = (sourceNode.ancestors ?? []).map((id: any) => id.toString())

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

    const ancestorNodes = await this.genealogyModel.find({
      userId: { $in: ancestorIds.map((id) => this.toObjectId(id)) },
    }).lean()

    const ancestorNodeMap = new Map(
      ancestorNodes.map((node: any) => [node.userId.toString(), node]),
    )

    const fullPath = [...ancestorIds, sourceUserId]
    const awardedTo: Array<{ ownerUserId: string; leg: VolumeLeg; points: number }> = []

    for (let i = 0; i < fullPath.length - 1; i++) {
      const ancestorUserId = fullPath[i]
      const nextUserIdInPath = fullPath[i + 1]

      const ancestorNode: any = ancestorNodeMap.get(ancestorUserId)
      if (!ancestorNode) continue

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

      await this.volumeBucketModel.updateOne(
        {
          ownerUserId: this.toObjectId(ancestorUserId),
          leg,
        },
        {
          $inc: {
            totalPoints: points,
            availablePoints: points,
          },
        },
        { upsert: true },
      )

      await this.userModel.updateOne(
        { _id: this.toObjectId(ancestorUserId) },
        leg === VolumeLeg.LEFT
          ? { $inc: { leftLegPoints: points } }
          : { $inc: { rightLegPoints: points } },
      )

      await this.volumeLedgerModel.create({
        eventKey,
        ownerUserId: this.toObjectId(ancestorUserId),
        sourceUserId: this.toObjectId(sourceUserId),
        leg,
        membershipTier,
        points,
        reason,
      })

      awardedTo.push({
        ownerUserId: ancestorUserId,
        leg,
        points,
      })
    }

    return {
      sourceUserId,
      points,
      membershipTier,
      eventKey,
      awardedTo,
      skipped: false,
    }
  }

  async awardActivationVolume(memberUserId: string) {
    if (!this.isValidObjectId(memberUserId)) {
      throw new BadRequestException('Invalid memberUserId')
    }

    const user = await this.userModel.findById(memberUserId).lean()
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const points = this.getTierPoints(user.membershipTier)
    const eventKey = `activation:${memberUserId}`

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
    const delta = newPoints - oldPoints

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

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const leftBucket = buckets.find((b) => b.leg === VolumeLeg.LEFT)
    const rightBucket = buckets.find((b) => b.leg === VolumeLeg.RIGHT)

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        membershipTier: user.membershipTier,
      },
      legs: {
        left: {
          userFieldPoints: user.leftLegPoints ?? 0,
          totalPoints: leftBucket?.totalPoints ?? 0,
          availablePoints: leftBucket?.availablePoints ?? 0,
        },
        right: {
          userFieldPoints: user.rightLegPoints ?? 0,
          totalPoints: rightBucket?.totalPoints ?? 0,
          availablePoints: rightBucket?.availablePoints ?? 0,
        },
      },
      recentLedger: ledger,
    }
  }
}