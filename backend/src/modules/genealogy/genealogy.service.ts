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
import { VolumeLedger, VolumeLedgerDocument } from '../volume/schemas/volume-ledger.schema'
import { VolumeService } from '../volume/volume.service'
import {
  ProductPin,
  ProductPinDocument,
} from '../product-pins/schema/product-pins.schema'

@Injectable()
export class GenealogyService {
  constructor(
    @InjectModel(GenealogyNode.name)
    private readonly genealogyModel: Model<GenealogyNodeDocument>,

    @InjectModel(VolumeLedger.name)
    private readonly volumeLedgerModel: Model<VolumeLedgerDocument>,

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
   * direct referral  = target.sponsorId === rootUserId
   * indirect referral = rootUserId exists higher in sponsor chain at level 2+
   *
   * spillover = target is inside root user's genealogy subtree,
   *             but target was NOT directly sponsored by root user
   *
   * Important:
   * - direct / indirect use sponsorId
   * - spillover uses genealogy ancestors / placement tree
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

    const [users, downlineNodes] = await Promise.all([
      this.userModel
        .find(
          {},
          {
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
          },
        )
        .lean(),
      this.genealogyModel
        .find({
          ancestors: rootObjectId,
        })
        .lean(),
    ])

    const userMap = new Map<string, any>(
      users.map((user: any) => [user._id.toString(), user]),
    )

    // sponsor tree map: sponsorId -> direct sponsored users
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
    const spillover: any[] = []
    const all: any[] = []
    const visited = new Set<string>()

    /**
     * Walk sponsor network only.
     * level 1 = direct
     * level 2+ = indirect
     */
    const walkSponsorTree = (sponsorUserId: string, level: number) => {
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

        walkSponsorTree(childId, level + 1)
      }
    }

    walkSponsorTree(rootUserId, 1)

    /**
     * Spillover uses genealogy downline.
     * If a user is in my genealogy subtree but I did not directly sponsor them,
     * they count as spillover for me.
     *
     * A member can be both:
     * - indirect referral
     * - spillover
     *
     * because sponsor chain and placement tree are separate concepts.
     */
    for (const node of downlineNodes) {
      const downlineUserId = node.userId.toString()
      if (downlineUserId === rootUserId) continue

      const user: any = userMap.get(downlineUserId)
      if (!user) continue

      const sponsorId = user.sponsorId?.toString() ?? null

      // Direct sponsored users are direct referrals, not spillover for root user
      if (sponsorId === rootUserId) {
        continue
      }

      spillover.push({
        id: downlineUserId,
        userId: downlineUserId,
        name: user.name ?? '',
        username: user.username,
        email: user.email,
        role: user.role,
        membershipTier: user.membershipTier,
        sponsorId,
        referralCode: user.referralCode ?? '',
        profileImage: user.profileImage ?? '',
        leftLegPoints: user.leftLegPoints ?? 0,
        rightLegPoints: user.rightLegPoints ?? 0,
        age: user.age ?? null,
        contact: user.contact ?? '',
        address: user.address ?? '',
        beneficiary: user.beneficiary ?? '',
        birthday: user.birthday ?? '',
        parentUserId: node.parentUserId?.toString() ?? null,
        position: node.position ?? null,
        depth: node.depth ?? 0,
        referralType: 'spillover',
      })
    }

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
        spillover: spillover.length,
        total: all.length, // total sponsor-network referrals only (direct + indirect)
      },
      direct,
      indirect,
      spillover,
      all,
    }
  }

  /**
   * Get count + full list of direct / indirect / spillover
   */
  async getReferralCounts(userId: string) {
    return this.buildReferralLists(userId)
  }

  /**
   * Relationship meaning:
   * - direct: target.sponsorId === rootUserId
   * - indirect: rootUserId found higher in sponsor chain at level 2+
   * - spillover: target is in root genealogy subtree but target.sponsorId !== rootUserId
   *
   * We return booleans because one user can be both:
   * - indirect referral
   * - spillover
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
        isDirectReferral: false,
        isIndirectReferral: false,
        isSpillover: false,
        sponsorLevel: 0,
        sponsorChain: [],
        message: 'A user is not their own referral',
      }
    }

    const [rootUser, targetUser, targetNode] = await Promise.all([
      this.userModel.findById(rootUserId).lean(),
      this.userModel.findById(targetUserId).lean(),
      this.genealogyModel
        .findOne({
          userId: this.toObjectId(targetUserId),
        })
        .lean(),
    ])

    if (!rootUser) {
      throw new NotFoundException('Root user not found')
    }

    if (!targetUser) {
      throw new NotFoundException('Target user not found')
    }

    let current: any = targetUser
    let sponsorLevel = 0
    const sponsorChain: string[] = []
    let isDirectReferral = false
    let isIndirectReferral = false

    /**
     * Walk upward through sponsor chain:
     * target -> sponsor -> sponsor's sponsor -> ...
     */
    while (current?.sponsorId) {
      sponsorLevel++

      const sponsorId = current.sponsorId.toString()
      sponsorChain.push(sponsorId)

      if (sponsorId === rootUserId) {
        if (sponsorLevel === 1) {
          isDirectReferral = true
        } else {
          isIndirectReferral = true
        }
        break
      }

      current = await this.userModel.findById(sponsorId).lean()
      if (!current) break
    }

    const isGenealogyDownline = !!targetNode?.ancestors?.some(
      (ancestorId: any) => ancestorId.toString() === rootUserId,
    )

    /**
     * spillover means:
     * target is in my genealogy subtree,
     * but I did not directly sponsor target.
     */
    const isSpillover =
      isGenealogyDownline &&
      targetUser.sponsorId?.toString() !== rootUserId

    return {
      rootUserId,
      targetUserId,
      related: isDirectReferral || isIndirectReferral || isSpillover,
      isDirectReferral,
      isIndirectReferral,
      isSpillover,
      sponsorLevel: isDirectReferral || isIndirectReferral ? sponsorLevel : 0,
      sponsorChain,
      isGenealogyDownline,
      sponsorId: targetUser.sponsorId?.toString() ?? null,
      parentUserId: targetNode?.parentUserId?.toString() ?? null,
      position: targetNode?.position ?? null,
      depth: targetNode?.depth ?? 0,
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

    if (!this.isValidObjectId(dto.placerUserId)) {
      throw new BadRequestException('Invalid placerUserId')
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

    if (existingUser._id.toString() === dto.placerUserId) {
      throw new BadRequestException('You cannot place yourself')
    }

    const placerUser = await this.userModel.findById(dto.placerUserId)
    if (!placerUser) {
      throw new NotFoundException('Placer user not found')
    }

    const existingNode = await this.genealogyModel.findOne({
      userId: existingUser._id,
    })

    if (existingNode) {
      throw new BadRequestException('User is already placed in genealogy')
    }

    /**
     * IMPORTANT DISTINCTION
     * parentUserId = genealogy placement parent
     * sponsorId    = actual referrer / actual placer
     *
     * Example:
     * Ryan places Illest under Tim
     * - parentUserId = Tim
     * - sponsorId    = Ryan
     *
     * Result:
     * - Ryan gets direct referral
     * - Tim gets spillover
     */
    existingUser.sponsorId = placerUser._id
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

  
  //SPILLOVER BONUS NI GAW
  async getSpilloverBonus(userId: string) {
  if (!this.isValidObjectId(userId)) {
    throw new BadRequestException('Invalid userId')
  }

  // Reuse existing logic to get spillover members
  const { spillover, rootUser } = await this.buildReferralLists(userId)

  if (spillover.length === 0) {
    return {
      userId,
      rootUser,
      spilloverCount: 0,
      totalPoints: 0,
      totalBonusPHP: 0,
      pointsPerPHP: 400,
      breakdown: [],
    }
  }

  const spilloverUserIds = spillover.map((s) => this.toObjectId(s.userId))

  // Sum all volume ledger entries where this user is owner
  // and the source is one of their spillover members
  const ledgerEntries = await this.volumeLedgerModel
    .find({
      ownerUserId: this.toObjectId(userId),
      sourceUserId: { $in: spilloverUserIds },
    })
    .lean()

  // Group points per spillover member for the breakdown
  const pointsPerMember = new Map<string, number>()

  for (const entry of ledgerEntries) {
    const sourceId = entry.sourceUserId.toString()
    const current = pointsPerMember.get(sourceId) ?? 0
    pointsPerMember.set(sourceId, current + entry.points)
  }

  const RATE = 400 // 1 point = ₱400

  const breakdown = spillover.map((member) => {
    const points = pointsPerMember.get(member.userId) ?? 0
    return {
      userId: member.userId,
      name: member.name,
      username: member.username,
      membershipTier: member.membershipTier,
      leg: member.position,      // left or right from genealogy
      depth: member.depth,
      pointsContributed: points,
      bonusEarnedPHP: points * RATE,
    }
  })

  const totalPoints = breakdown.reduce((sum, b) => sum + b.pointsContributed, 0)

  return {
    userId,
    rootUser,
    spilloverCount: spillover.length,
    totalPoints,
    totalBonusPHP: totalPoints * RATE,
    pointsPerPHP: RATE,
    breakdown,
  }
}
}