import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import {
  GenealogyNode,
  GenealogyNodeDocument,
  GenealogySide,
} from './schema/genealogy-node.schema';

import {
  User,
  UserDocument,
} from '../users/schemas/user.schema';

import {
  ProductPin,
  ProductPinDocument,
  PinStatus,
} from '../product-pins/schema/product-pins.schema';

import { PlaceMemberDto } from './dto/place-member.dto';
import { FindSlotDto } from './dto/find-slot.dto';

@Injectable()
export class GenealogyService {
  constructor(
    @InjectModel(GenealogyNode.name)
    private readonly genealogyModel: Model<GenealogyNodeDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(ProductPin.name)
    private readonly pinModel: Model<ProductPinDocument>,
  ) {}

  private isValidObjectId(id: string) {
    return Types.ObjectId.isValid(id);
  }

  private toObjectId(id: string) {
    return new Types.ObjectId(id);
  }

  /**
   * Temporary implementation:
   * because pins are bcrypt-hashed, we cannot query by raw pin directly.
   * So we scan all UNUSED pins and compare.
   * Works for now, but later you should add a searchable pin fingerprint.
   */
  private async consumeUnusedPin(rawPin: string, userId: string) {
    const unusedPins = await this.pinModel.find({
      status: PinStatus.UNUSED,
    });

    for (const pin of unusedPins) {
      const isMatch = await bcrypt.compare(rawPin, pin.pinHash);
      if (!isMatch) continue;

      pin.status = PinStatus.USED;
      pin.usedByUserId = this.toObjectId(userId);
      pin.usedAt = new Date();
      await pin.save();

      return pin;
    }

    throw new BadRequestException('Invalid or already used product pin');
  }

  async createRoot(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const existingNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    });

    if (existingNode) {
      throw new BadRequestException('User is already placed in genealogy');
    }

    const node = await this.genealogyModel.create({
      userId: this.toObjectId(userId),
      parentUserId: null,
      position: null,
      sponsorId: user.sponsorId ?? this.toObjectId(userId),
      leftChildUserId: null,
      rightChildUserId: null,
      depth: 0,
      ancestors: [],
      isActive: true,
      activatedAt: new Date(),
    });

    return {
      message: 'Root node created',
      node: {
        id: node._id.toString(),
        userId: node.userId.toString(),
        parentUserId: null,
        position: node.position,
        depth: node.depth,
        isActive: node.isActive,
      },
    };
  }

  async findAvailableSlot(dto: FindSlotDto) {
    if (!this.isValidObjectId(dto.sponsorId)) {
      throw new BadRequestException('Invalid sponsorId');
    }

    const sponsorNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(dto.sponsorId),
    });

    if (!sponsorNode) {
      throw new NotFoundException('Sponsor is not placed in genealogy');
    }

    const directField =
      dto.preferredSide === GenealogySide.LEFT
        ? 'leftChildUserId'
        : 'rightChildUserId';

    // If sponsor has direct slot open, place directly under sponsor
    if (!sponsorNode[directField]) {
      return {
        parentUserId: sponsorNode.userId.toString(),
        finalPosition: dto.preferredSide,
        reason: 'direct-slot',
      };
    }

    // If occupied, search only inside that chosen branch
    const branchRootUserId = sponsorNode[directField];
    if (!branchRootUserId) {
      throw new BadRequestException('Branch root not found');
    }

    const queue: Types.ObjectId[] = [branchRootUserId];

    while (queue.length > 0) {
      const currentUserId = queue.shift();
      if (!currentUserId) continue;

      const currentNode = await this.genealogyModel.findOne({
        userId: currentUserId,
      });

      if (!currentNode) continue;

      // First available slot: left, then right
      if (!currentNode.leftChildUserId) {
        return {
          parentUserId: currentNode.userId.toString(),
          finalPosition: GenealogySide.LEFT,
          reason: 'spillover-left',
        };
      }

      if (!currentNode.rightChildUserId) {
        return {
          parentUserId: currentNode.userId.toString(),
          finalPosition: GenealogySide.RIGHT,
          reason: 'spillover-right',
        };
      }

      queue.push(currentNode.leftChildUserId);
      queue.push(currentNode.rightChildUserId);
    }

    throw new BadRequestException('No available slot found in selected branch');
  }

  async placeMember(dto: PlaceMemberDto) {
    if (!this.isValidObjectId(dto.userId)) {
      throw new BadRequestException('Invalid userId');
    }

    if (!this.isValidObjectId(dto.sponsorId)) {
      throw new BadRequestException('Invalid sponsorId');
    }

    if (dto.userId === dto.sponsorId) {
      throw new BadRequestException('User cannot sponsor themselves');
    }

    const user = await this.userModel.findById(dto.userId);
    if (!user) throw new NotFoundException('User not found');

    const sponsor = await this.userModel.findById(dto.sponsorId);
    if (!sponsor) throw new NotFoundException('Sponsor not found');

    const existingNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(dto.userId),
    });

    if (existingNode) {
      throw new BadRequestException('User is already placed in genealogy');
    }

    const sponsorNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(dto.sponsorId),
    });

    if (!sponsorNode) {
      throw new BadRequestException(
        'Sponsor is not yet placed in genealogy. Create/place sponsor first.',
      );
    }

    // 1) consume product pin (this is the activation step)
    const consumedPin = await this.consumeUnusedPin(dto.productPin, dto.userId);

    // 2) find final slot
    const slot = await this.findAvailableSlot({
      sponsorId: dto.sponsorId,
      preferredSide: dto.preferredSide,
    });

    const parentNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(slot.parentUserId),
    });

    if (!parentNode) {
      throw new NotFoundException('Placement parent not found');
    }

    const parentField =
      slot.finalPosition === GenealogySide.LEFT
        ? 'leftChildUserId'
        : 'rightChildUserId';

    if (parentNode[parentField]) {
      throw new BadRequestException('Final slot is no longer available');
    }

    // 3) update user based on activation
    user.sponsorId = this.toObjectId(dto.sponsorId);
    user.membershipTier = consumedPin.tier;
    await user.save();

    // 4) create genealogy node
    const node = await this.genealogyModel.create({
      userId: this.toObjectId(dto.userId),
      parentUserId: parentNode.userId,
      position: slot.finalPosition,
      sponsorId: this.toObjectId(dto.sponsorId),
      leftChildUserId: null,
      rightChildUserId: null,
      depth: parentNode.depth + 1,
      ancestors: [...parentNode.ancestors, parentNode.userId],
      isActive: true,
      activatedAt: new Date(),
    });

    // 5) update parent child pointer
    parentNode[parentField] = this.toObjectId(dto.userId);
    await parentNode.save();

    return {
      message: 'Member placed and activated successfully',
      placement: {
        nodeId: node._id.toString(),
        userId: node.userId.toString(),
        sponsorId: node.sponsorId.toString(),
        parentUserId: node.parentUserId?.toString() ?? null,
        position: node.position,
        depth: node.depth,
        isActive: node.isActive,
      },
      activation: {
        tier: consumedPin.tier,
        pinId: consumedPin._id.toString(),
        pinStatus: consumedPin.status,
      },
      slotResolution: {
        reason: slot.reason,
        chosenSide: dto.preferredSide,
        finalPosition: slot.finalPosition,
      },
    };
  }

  async getNode(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const node = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    });

    if (!node) throw new NotFoundException('Genealogy node not found');

    return {
      id: node._id.toString(),
      userId: node.userId.toString(),
      parentUserId: node.parentUserId?.toString() ?? null,
      position: node.position,
      sponsorId: node.sponsorId.toString(),
      leftChildUserId: node.leftChildUserId?.toString() ?? null,
      rightChildUserId: node.rightChildUserId?.toString() ?? null,
      depth: node.depth,
      ancestors: node.ancestors.map((a) => a.toString()),
      isActive: node.isActive,
      activatedAt: node.activatedAt,
      createdAt: (node as any).createdAt,
      updatedAt: (node as any).updatedAt,
    };
  }

  async getChildren(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const node = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    });

    if (!node) throw new NotFoundException('Genealogy node not found');

    const childIds = [node.leftChildUserId, node.rightChildUserId].filter(
      Boolean,
    ) as Types.ObjectId[];

    const childUsers =
      childIds.length > 0
        ? await this.userModel
            .find({ _id: { $in: childIds } })
            .select('name email membershipTier referralCode')
            .lean()
        : [];

    const usersMap = new Map(
      childUsers.map((u: any) => [u._id.toString(), u]),
    );

    const leftUser = node.leftChildUserId
      ? usersMap.get(node.leftChildUserId.toString()) ?? null
      : null;

    const rightUser = node.rightChildUserId
      ? usersMap.get(node.rightChildUserId.toString()) ?? null
      : null;

    return {
      userId: node.userId.toString(),
      left: node.leftChildUserId
        ? {
            userId: node.leftChildUserId.toString(),
            name: leftUser?.name ?? null,
            email: leftUser?.email ?? null,
            membershipTier: leftUser?.membershipTier ?? null,
            referralCode: leftUser?.referralCode ?? null,
          }
        : null,
      right: node.rightChildUserId
        ? {
            userId: node.rightChildUserId.toString(),
            name: rightUser?.name ?? null,
            email: rightUser?.email ?? null,
            membershipTier: rightUser?.membershipTier ?? null,
            referralCode: rightUser?.referralCode ?? null,
          }
        : null,
    };
  }

  async getUpline(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const node = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    });

    if (!node) throw new NotFoundException('Genealogy node not found');

    if (!node.ancestors.length) {
      return {
        userId: node.userId.toString(),
        upline: [],
      };
    }

    const ancestorNodes = await this.genealogyModel
      .find({ userId: { $in: node.ancestors } })
      .sort({ depth: 1 })
      .lean();

    return {
      userId: node.userId.toString(),
      upline: ancestorNodes.map((a: any) => ({
        userId: a.userId.toString(),
        parentUserId: a.parentUserId ? a.parentUserId.toString() : null,
        position: a.position,
        depth: a.depth,
      })),
    };
  }
}