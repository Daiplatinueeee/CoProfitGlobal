import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import { ActivateMemberDto } from './dto/activate-member.dto'
import { Activation, ActivationDocument } from './schemas/activation.schema'

import { GenealogyService } from '../genealogy/genealogy.service'
import { MembershipTier } from '../users/schemas/user.schema'
import { GenealogySide } from '../genealogy/schema/genealogy-node.schema'

@Injectable()
export class ActivationsService {
  constructor(
    private readonly genealogyService: GenealogyService,
    @InjectModel(Activation.name)
    private readonly activationModel: Model<ActivationDocument>,
  ) {}

  private toObjectId(id: string) {
    return new Types.ObjectId(id)
  }

  private pointsForTier(tier: MembershipTier): number {
    switch (tier) {
      case MembershipTier.BRONZE:
        return 1
      case MembershipTier.SILVER:
        return 3
      case MembershipTier.GOLD:
        return 5
      case MembershipTier.PLATINUM:
        return 7
      default:
        return 0
    }
  }

  async activateAndPlace(dto: ActivateMemberDto) {
    if (!dto.parentUserId) {
      throw new BadRequestException('parentUserId is required')
    }

    if (!dto.leg) {
      throw new BadRequestException('leg is required')
    }

    if (!dto.username) {
      throw new BadRequestException('username is required')
    }

    const result = await this.genealogyService.placeMember({
      parentUserId: dto.parentUserId,
      leg: dto.leg as GenealogySide,
      username: dto.username,
    })

    if (!result.membershipTier) {
      throw new BadRequestException('Placed user has no membership tier')
    }

    const tier = result.membershipTier as MembershipTier
    const points = this.pointsForTier(tier)

    const activation = await this.activationModel.create({
      userId: this.toObjectId(result.id),
      sponsorId: this.toObjectId(dto.sponsorId),
      placementParentUserId: this.toObjectId(dto.parentUserId),
      position: dto.leg,
      tier,
      points,
      pinId: dto.pinId ? this.toObjectId(dto.pinId) : undefined,
      activatedAt: new Date(),
    })

    return {
      message: 'Placed + recorded activation',
      activation: {
        id: activation._id.toString(),
        userId: result.id,
        sponsorId: dto.sponsorId,
        placementParentUserId: dto.parentUserId,
        position: dto.leg,
        tier,
        points,
        pinId: dto.pinId ?? null,
        activatedAt: activation.activatedAt,
        createdAt: (activation as any).createdAt,
      },
      placementResult: result,
    }
  }

  async getLatestActivation(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const row = await this.activationModel
      .findOne({ userId: this.toObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()

    if (!row) return null

    return {
      id: row._id.toString(),
      userId: row.userId.toString(),
      sponsorId: row.sponsorId.toString(),
      placementParentUserId: row.placementParentUserId.toString(),
      position: row.position,
      tier: row.tier,
      points: row.points,
      pinId: row.pinId?.toString?.() ?? null,
      activatedAt: row.activatedAt,
      createdAt: (row as any).createdAt,
    }
  }
}