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

  /**
   * This helper loads all users once, then builds a sponsor tree in memory.
   * We use sponsorId because sponsorId = who referred the user.
   *
   * direct referral  = user.sponsorId === rootUserId
   * indirect referral = rootUserId exists somewhere higher in the sponsor chain
   */
  private async buildReferralLists(rootUserId: string) {
    if (!this.isValidObjectId(rootUserId)) {
      throw new BadRequestException('Invalid userId')
    }

    const rootObjectId = this.toObjectId(rootUserId)

    const rootUser = await this.userModel.findById(rootObjectId).lean()
    if (!rootUser) {
      throw new NotFoundException('User not found')
    }

    // Load users needed for referral traversal
    const users = await this.userModel
      .find({}, {
        name: 1,
        username: 1,
        email: 1,
        role: 1,
        membershipTier: 1,
        sponsorId: 1,
        referralCode: 1,
        profileImage: 1,
        leftLegPoints: 1,
        rightLegPoints: 1,
        age: 1,
        contact: 1,
        address: 1,
        beneficiary: 1,
        birthday: 1,
      })
      .lean()

    // Group users by sponsorId
    const sponsoredByMap = new Map<string, any[]>()

    for (const user of users) {
      const sponsorId = user.sponsorId?.toString()
      if (!sponsorId) continue

      if (!sponsoredByMap.has(sponsorId)) {
        sponsoredByMap.set(sponsorId, [])
      }

      sponsoredByMap.get(sponsorId)!.push(user)
    }

    const direct: any[] = []
    const indirect: any[] = []
    const all: any[] = []
    const visited = new Set<string>()

    /**
     * level = 1 -> direct referral
     * level >= 2 -> indirect referral
     */
    const walk = (sponsorUserId: string, level: number) => {
      const children = sponsoredByMap.get(sponsorUserId) ?? []

      for (const child of children) {
        const childId = child._id.toString()

        if (visited.has(childId)) continue
        visited.add(childId)

        const item = {
          id: childId,
          userId: childId,
          name: child.name ?? '',
          username: child.username,
          email: child.email,
          role: child.role,
          membershipTier: child.membershipTier,
          sponsorId: child.sponsorId?.toString() ?? null,
          referralCode: child.referralCode ?? '',
          profileImage: child.profileImage ?? '',
          leftLegPoints: child.leftLegPoints ?? 0,
          rightLegPoints: child.rightLegPoints ?? 0,
          age: child.age ?? null,
          contact: child.contact ?? '',
          address: child.address ?? '',
          beneficiary: child.beneficiary ?? '',
          birthday: child.birthday ?? '',
          referralLevel: level,
          referralType: level === 1 ? 'direct' : 'indirect',
        }

        all.push(item)

        if (level === 1) {
          direct.push(item)
        } else {
          indirect.push(item)
        }

        walk(childId, level + 1)
      }
    }

    walk(rootUserId, 1)

    return {
      rootUser: {
        id: rootUser._id.toString(),
        userId: rootUser._id.toString(),
        name: rootUser.name ?? '',
        username: rootUser.username,
        email: rootUser.email,
        role: rootUser.role,
        membershipTier: rootUser.membershipTier,
        sponsorId: rootUser.sponsorId?.toString() ?? null,
        referralCode: rootUser.referralCode ?? '',
      },
      counts: {
        direct: direct.length,
        indirect: indirect.length,
        total: all.length,
      },
      direct,
      indirect,
      all,
    }
  }

  /**
   * Get count + full list of referrals
   */
  async getReferralCounts(userId: string) {
    return this.buildReferralLists(userId)
  }

  /**
   * Validate relation between root user and target user.
   *
   * direct referral:
   *   target.sponsorId === rootUserId
   *
   * indirect referral:
   *   target.sponsorId !== rootUserId
   *   BUT if we keep following sponsorId upward,
   *   it eventually reaches rootUserId
   */
  async getReferralRelation(rootUserId: string, targetUserId: string) {
    if (!this.isValidObjectId(rootUserId)) {
      throw new BadRequestException('Invalid rootUserId')
    }

    if (!this.isValidObjectId(targetUserId)) {
      throw new BadRequestException('Invalid targetUserId')
    }

    if (rootUserId === targetUserId) {
      return {
        rootUserId,
        targetUserId,
        related: false,
        type: null,
        level: 0,
        message: 'A user is not their own referral',
      }
    }

    let current = await this.userModel.findById(targetUserId).lean()

    if (!current) {
      throw new NotFoundException('Target user not found')
    }

    let level = 0
    const chain: string[] = []

    /**
     * We start from target user and keep moving upward:
     *
     * targetUser -> sponsorId -> sponsor's sponsorId -> ...
     *
     * If at any step sponsorId === rootUserId,
     * then the target user belongs to root user's referral network.
     *
     * level 1 = direct
     * level 2+ = indirect
     */
    while (current?.sponsorId) {
      level++

      const sponsorId = current.sponsorId.toString()
      chain.push(sponsorId)

      if (sponsorId === rootUserId) {
        return {
          rootUserId,
          targetUserId,
          related: true,
          type: level === 1 ? 'direct' : 'indirect',
          level,
          chain,
        }
      }

      current = await this.userModel.findById(sponsorId).lean()
    }

    return {
      rootUserId,
      targetUserId,
      related: false,
      type: null,
      level: 0,
      chain,
    }
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

  // set sponsor/referrer = placer
  existingUser.sponsorId = parentNode.userId
  await existingUser.save()

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
    sponsorId: existingUser.sponsorId?.toString() ?? null,
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