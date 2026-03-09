import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import * as bcrypt from 'bcrypt'

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

@Injectable()
export class GenealogyService {
  constructor(
    @InjectModel(GenealogyNode.name)
    private readonly genealogyModel: Model<GenealogyNodeDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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
      username: (user as any).username ?? (user as any).name ?? '',
      email: (user as any).email ?? '',
      profileImage: (user as any).profileImage ?? '',
      referralCode: (user as any).referralCode ?? '',
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

    const existingEmail = await this.userModel.findOne({ email: dto.email })
    if (existingEmail) {
      throw new BadRequestException('Email already exists')
    }

    const existingReferralCode = await this.userModel.findOne({
      referralCode: dto.referralCode,
    })
    if (existingReferralCode) {
      throw new BadRequestException('Referral code already exists')
    }

    const hashedPassword = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : ''

    const createdUser = await this.userModel.create({
      name: dto.username,
      username: dto.username,
      email: dto.email,
      passwordHash: hashedPassword,
      profileImage: dto.profileImage ?? '',
      referralCode: dto.referralCode,
      leftLegPoints: 0,
      rightLegPoints: 0,
      age: dto.age,
      contact: dto.contact,
      address: dto.address,
      beneficiary: dto.beneficiary,
      birthday: dto.birthday,
      role: SystemRole.USER,
    })

    const childNode = await this.genealogyModel.create({
      userId: createdUser._id,
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

    return {
      id: createdUser._id.toString(),
      username: createdUser.username,
      email: createdUser.email,
      profileImage: createdUser.profileImage ?? '',
      referralCode: createdUser.referralCode ?? '',
      leftLegPoints: createdUser.leftLegPoints ?? 0,
      rightLegPoints: createdUser.rightLegPoints ?? 0,
      age: createdUser.age,
      contact: createdUser.contact,
      address: createdUser.address,
      beneficiary: createdUser.beneficiary,
      birthday: createdUser.birthday,
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