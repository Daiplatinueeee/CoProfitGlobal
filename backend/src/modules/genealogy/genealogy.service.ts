import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'

import {
  GenealogyNode,
  GenealogyNodeDocument,
  GenealogySide,
} from './schema/genealogy-node.schema'
import { PlaceMemberDto } from './dto/place-member.dto'
import {
  User,
  UserDocument,
  SystemRole,
} from '../users/schemas/user.schema'

import { VolumeService } from '../volume/volume.service'
import { ProductPin, ProductPinDocument } from '../product-pins/schema/product-pins.schema'


@Injectable()
export class GenealogyService {
  constructor(
    @InjectModel(GenealogyNode.name)
    private readonly genealogyModel: Model<GenealogyNodeDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(ProductPin.name)
    private readonly productPinModel: Model<ProductPinDocument>,

  private readonly volumeService: VolumeService,
  ) {}

  private isValidObjectId(id: string) {
    return Types.ObjectId.isValid(id)
  }

  private toObjectId(id: string) {
    return new Types.ObjectId(id)
  }

  private async mapUserToMember(userId: Types.ObjectId | string) {
    const user = await this.userModel.findById(userId).lean()
    if (!user) return null

    return {
      id: (user as any)._id.toString(),
      userId: (user as any)._id.toString(),
      username: (user as any).username ?? (user as any).name ?? '',
      email: (user as any).email ?? '',
      profileImage: (user as any).profileImage ?? '',
      referralCode: (user as any).referralCode ?? '',
      membershipTier: (user as any).membershipTier ?? null,
      leftLegPoints: (user as any).leftLegPoints ?? 0,
      rightLegPoints: (user as any).rightLegPoints ?? 0,
      age: (user as any).age ?? undefined,
      contact: (user as any).contact ?? '',
      address: (user as any).address ?? '',
      beneficiary: (user as any).beneficiary ?? '',
      birthday: (user as any).birthday ?? '',
    }
  }

  private async buildTree(userId: string): Promise<any> {
    const node = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    })

    if (!node) return null

    const member = await this.mapUserToMember(node.userId)
    if (!member) return null

    let leftChild: any = undefined
    let rightChild: any = undefined

    if (node.leftChildUserId) {
      leftChild = await this.buildTree(node.leftChildUserId.toString())
    }

    if (node.rightChildUserId) {
      rightChild = await this.buildTree(node.rightChildUserId.toString())
    }

    return {
      ...member,
      leftChild,
      rightChild,
    }
  }

  async getOrCreateRoot(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    let node = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    })

    if (!node) {
      node = await this.genealogyModel.create({
        userId: this.toObjectId(userId),
        parentUserId: null,
        position: null,
        leftChildUserId: null,
        rightChildUserId: null,
        depth: 0,
        ancestors: [],
      })
    }

    const tree = await this.buildTree(userId)

    if (!tree) {
      throw new NotFoundException('Failed to load genealogy root')
    }

    return tree
  }

  async getTree(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const tree = await this.buildTree(userId)

    if (!tree) {
      throw new NotFoundException('Genealogy tree not found')
    }

    return tree
  }

  async placeMember(dto: PlaceMemberDto) {
    
    if (!this.isValidObjectId(dto.parentUserId)) {
      throw new BadRequestException('Invalid parentUserId')
    }

    const parentNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(dto.parentUserId),
    })

    if (!parentNode) {
      throw new NotFoundException('Parent genealogy node not found')
    }

    if (dto.leg === GenealogySide.LEFT && parentNode.leftChildUserId) {
      throw new BadRequestException('Left leg already occupied')
    }

    if (dto.leg === GenealogySide.RIGHT && parentNode.rightChildUserId) {
      throw new BadRequestException('Right leg already occupied')
    }

    const existingUser = await this.userModel.findOne({
      username: dto.username.trim(),
    })

    if (!existingUser) {
      throw new NotFoundException('User not found')
    }

    if (existingUser.role !== SystemRole.USER) {
      throw new BadRequestException('Only normal users can be placed in genealogy')
    }

    if (!existingUser.membershipTier) {
      throw new BadRequestException('User has no package tier yet')
    }

    if (existingUser._id.toString() === dto.parentUserId) {
      throw new BadRequestException('You cannot place a user under themselves')
    }

    const existingNode = await this.genealogyModel.findOne({
      userId: existingUser._id,
    })

    if (existingNode) {
      throw new BadRequestException('User is already placed in genealogy')
    }

    const childNode = await this.genealogyModel.create({
      userId: existingUser._id,
      parentUserId: parentNode.userId,
      position: dto.leg,
      leftChildUserId: null,
      rightChildUserId: null,
      depth: parentNode.depth + 1,
      ancestors: [...(parentNode.ancestors ?? []), parentNode.userId],
    })

    if (dto.leg === GenealogySide.LEFT) {
      parentNode.leftChildUserId = childNode.userId
    } else {
      parentNode.rightChildUserId = childNode.userId
    }
    
    await parentNode.save()
    await this.volumeService.awardActivationVolume(existingUser._id.toString())
    return {
      id: existingUser._id.toString(),
      userId: existingUser._id.toString(),
      username: existingUser.username,
      email: existingUser.email,
      profileImage: existingUser.profileImage ?? '',
      referralCode: existingUser.referralCode ?? '',
      membershipTier: existingUser.membershipTier,
      leftLegPoints: existingUser.leftLegPoints ?? 0,
      rightLegPoints: existingUser.rightLegPoints ?? 0,
      age: existingUser.age,
      contact: existingUser.contact,
      address: existingUser.address,
      beneficiary: existingUser.beneficiary,
      birthday: existingUser.birthday,
      parentUserId: parentNode.userId.toString(),
      leg: dto.leg,
    }
  }

  async getChildren(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const node = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    })

    if (!node) {
      throw new NotFoundException('Genealogy node not found')
    }

    const left = node.leftChildUserId
      ? await this.mapUserToMember(node.leftChildUserId)
      : null

    const right = node.rightChildUserId
      ? await this.mapUserToMember(node.rightChildUserId)
      : null

    return {
      userId,
      left,
      right,
    }
  }

  async getDownlines(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const rootNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    })

    if (!rootNode) {
      throw new NotFoundException('Genealogy node not found')
    }

    const downlineNodes = await this.genealogyModel
      .find({
        ancestors: this.toObjectId(userId),
      })
      .lean()

    const members = await Promise.all(
      downlineNodes.map(async (node: any) => {
        const user = await this.mapUserToMember(node.userId)
        return {
          ...user,
          parentUserId: node.parentUserId?.toString() ?? null,
          position: node.position ?? null,
          depth: node.depth ?? 0,
        }
      }),
    )

    return members.filter(Boolean)
  }

  async isDownline(sourceUserId: string, targetUserId: string) {
    if (!this.isValidObjectId(sourceUserId)) {
      throw new BadRequestException('Invalid sourceUserId')
    }

    if (!this.isValidObjectId(targetUserId)) {
      throw new BadRequestException('Invalid targetUserId')
    }

    const targetNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(targetUserId),
    })

    if (!targetNode) {
      throw new NotFoundException('Target genealogy node not found')
    }

    const isDownline = (targetNode.ancestors ?? []).some(
      (ancestorId) => ancestorId.toString() === sourceUserId,
    )

    return {
      sourceUserId,
      targetUserId,
      isDownline,
    }
  }
}