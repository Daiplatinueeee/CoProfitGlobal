import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { ActivateMemberDto } from './dto/activate-member.dto';
import { Activation, ActivationDocument } from './schemas/activation.schema';

import { GenealogyService } from '../genealogy/genealogy.service';
import { MembershipTier } from '../users/schemas/user.schema';

@Injectable()
export class ActivationsService {
  constructor(
    private readonly genealogyService: GenealogyService,
    @InjectModel(Activation.name) private readonly activationModel: Model<ActivationDocument>,
  ) {}

  private toObjectId(id: string) {
    return new Types.ObjectId(id);
  }

  private pointsForTier(tier: MembershipTier): number {
    switch (tier) {
      case MembershipTier.BRONZE:
        return 1;
      case MembershipTier.SILVER:
        return 3;
      case MembershipTier.GOLD:
        return 5;
      case MembershipTier.PLATINUM:
        return 7;
      default:
        // compile-time safety, runtime fallback
        return 0;
    }
  }

  /**
   * Activates (via product pin) and places member in genealogy.
   * NOTE: GenealogyService currently consumes the pin + sets membershipTier + creates genealogy node.
   * This service adds an activation audit record on top.
   */
  async activateAndPlace(dto: ActivateMemberDto) {
    // Delegate to genealogy (consumes pin + places)
    const result = await this.genealogyService.placeMember({
      userId: dto.userId,
      sponsorId: dto.sponsorId,
      preferredSide: dto.preferredSide,
      productPin: dto.productPin,
    });

    const tier = result?.activation?.tier as MembershipTier | undefined;
    const pinId = result?.activation?.pinId as string | undefined;

    const placementParentUserId = result?.placement?.parentUserId as string | null | undefined;
    const position = result?.placement?.position as any;

    if (!tier || !pinId || !placementParentUserId || !position) {
      throw new BadRequestException('Activation placement response missing required fields');
    }

    const points = this.pointsForTier(tier);

    const activation = await this.activationModel.create({
      userId: this.toObjectId(dto.userId),
      sponsorId: this.toObjectId(dto.sponsorId),
      placementParentUserId: this.toObjectId(placementParentUserId),
      position,
      tier,
      points,
      pinId: this.toObjectId(pinId),
      activatedAt: new Date(),
    });

    return {
      message: 'Activated + placed + recorded activation',
      activation: {
        id: activation._id.toString(),
        userId: dto.userId,
        sponsorId: dto.sponsorId,
        placementParentUserId,
        position,
        tier,
        points,
        pinId,
        activatedAt: activation.activatedAt,
        createdAt: (activation as any).createdAt,
      },
      placementResult: result,
    };
  }

  async getLatestActivation(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const row = await this.activationModel
      .findOne({ userId: this.toObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();

    if (!row) return null;

    return {
      id: row._id.toString(),
      userId: row.userId.toString(),
      sponsorId: row.sponsorId.toString(),
      placementParentUserId: row.placementParentUserId.toString(),
      position: row.position,
      tier: row.tier,
      points: row.points,
      pinId: row.pinId.toString(),
      activatedAt: row.activatedAt,
      createdAt: (row as any).createdAt,
    };
  }
}