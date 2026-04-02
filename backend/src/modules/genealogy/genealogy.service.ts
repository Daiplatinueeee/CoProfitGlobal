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
  MembershipTier,
  User,
  UserDocument,
} from '../users/schemas/user.schema'
import { VolumeLedger, VolumeLedgerDocument } from '../volume/schemas/volume-ledger.schema'
import {
  VolumeBucket,
  VolumeBucketDocument,
  VolumeLeg,
} from '../volume/schemas/volume-bucket.schema'
import { VolumeService } from '../volume/volume.service'
import {
  ProductPin,
  ProductPinDocument,
  PinStatus,
} from '../product-pins/schema/product-pins.schema'
import { WalletService } from '../wallet/wallet.service'
import { WalletCurrency, WalletTxnSource } from '../wallet/schemas/wallet-transaction.schema'
import { UsersService } from '../users/users.service'

@Injectable()
export class GenealogyService {
  constructor(
    @InjectModel(GenealogyNode.name)
    private readonly genealogyModel: Model<GenealogyNodeDocument>,

    @InjectModel(VolumeLedger.name)
    private readonly volumeLedgerModel: Model<VolumeLedgerDocument>,

    @InjectModel(VolumeBucket.name)
    private readonly volumeBucketModel: Model<VolumeBucketDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(ProductPin.name)
    private readonly productPinModel: Model<ProductPinDocument>,

    private readonly volumeService: VolumeService,
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
  ) {}

  // ── Placement bonus rate maps ─────────────────────────────────────────────

  private readonly DIRECT_BONUS: Record<MembershipTier, number> = {
    [MembershipTier.FREE]:     0,
    [MembershipTier.BRONZE]:   100,
    [MembershipTier.SILVER]:   300,
    [MembershipTier.GOLD]:     500,
    [MembershipTier.PLATINUM]: 700,
  }

  private readonly INDIRECT_BONUS: Record<MembershipTier, number> = {
    [MembershipTier.FREE]:     0,
    [MembershipTier.BRONZE]:   5,
    [MembershipTier.SILVER]:   15,
    [MembershipTier.GOLD]:     25,
    [MembershipTier.PLATINUM]: 35,
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private isValidObjectId(id: string) {
    return Types.ObjectId.isValid(id)
  }

  private toObjectId(id: string) {
    return new Types.ObjectId(id)
  }

  /**
   * Fetch both volume buckets for a user and return availablePoints.
   */
  private async getAvailablePoints(userId: Types.ObjectId | string): Promise<{
    leftAvailablePoints: number
    rightAvailablePoints: number
  }> {
    const uid =
      typeof userId === 'string' ? this.toObjectId(userId) : userId

    const [leftBucket, rightBucket] = await Promise.all([
      this.volumeBucketModel
        .findOne({ ownerUserId: uid, leg: VolumeLeg.LEFT })
        .lean(),
      this.volumeBucketModel
        .findOne({ ownerUserId: uid, leg: VolumeLeg.RIGHT })
        .lean(),
    ])

    return {
      leftAvailablePoints:  leftBucket?.availablePoints  ?? 0,
      rightAvailablePoints: rightBucket?.availablePoints ?? 0,
    }
  }

  // ── Member mapper ─────────────────────────────────────────────────────────

  private async mapUserToMember(userId: Types.ObjectId | string) {
    const user = await this.userModel.findById(userId).lean()
    if (!user) return null

    const { leftAvailablePoints, rightAvailablePoints } =
      await this.getAvailablePoints((user as any)._id)

    return {
      id:                   (user as any)._id.toString(),
      userId:               (user as any)._id.toString(),
      username:             (user as any).username ?? (user as any).name ?? '',
      email:                (user as any).email ?? '',
      profileImage:         (user as any).profileImage ?? '',
      referralCode:         (user as any).referralCode ?? '',
      membershipTier:       (user as any).membershipTier ?? null,
      // total points (historical, never decremented)
      leftLegPoints:        (user as any).leftLegPoints  ?? 0,
      rightLegPoints:       (user as any).rightLegPoints ?? 0,
      // available points (decremented after each pairing) ← used in UI
      leftAvailablePoints,
      rightAvailablePoints,
      age:                  (user as any).age        ?? undefined,
      contact:              (user as any).contact    ?? '',
      address:              (user as any).address    ?? '',
      beneficiary:          (user as any).beneficiary ?? '',
      birthday:             (user as any).birthday   ?? '',
    }
  }

  // ── Tree builder ──────────────────────────────────────────────────────────

  private async buildTree(userId: string): Promise<any> {
    const node = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    })

    if (!node) return null

    const member = await this.mapUserToMember(node.userId)
    if (!member) return null

    let leftChild:  any = undefined
    let rightChild: any = undefined

    if (node.leftChildUserId) {
      leftChild = await this.buildTree(node.leftChildUserId.toString())
    }

    if (node.rightChildUserId) {
      rightChild = await this.buildTree(node.rightChildUserId.toString())
    }

    return { ...member, leftChild, rightChild }
  }

  // ── Referral lists ────────────────────────────────────────────────────────

  /**
   * direct referral  = target.sponsorId === rootUserId
   * indirect referral = rootUserId exists higher in sponsor chain at level 2+
   * spillover = target is inside root user's genealogy subtree,
   *             but target was NOT directly sponsored by root user
   */
  private async buildReferralLists(rootUserId: string) {
    if (!this.isValidObjectId(rootUserId)) {
      throw new BadRequestException('Invalid userId')
    }

    const rootObjectId = this.toObjectId(rootUserId)

    const rootUser = await this.userModel.findById(rootObjectId).lean()
    if (!rootUser) throw new NotFoundException('User not found')

    const [users, downlineNodes] = await Promise.all([
      this.userModel
        .find(
          {},
          {
            name: 1, username: 1, email: 1, role: 1,
            membershipTier: 1, sponsorId: 1, referralCode: 1,
            profileImage: 1, leftLegPoints: 1, rightLegPoints: 1,
            age: 1, contact: 1, address: 1, beneficiary: 1, birthday: 1,
            createdAt: 1,
          },
        )
        .lean(),
      this.genealogyModel.find({ ancestors: rootObjectId }).lean(),
    ])

    const userMap = new Map<string, any>(
      users.map((user: any) => [user._id.toString(), user]),
    )

    // sponsor tree map: sponsorId -> direct sponsored users
    const sponsoredByMap = new Map<string, any[]>()

    for (const user of users) {
      const sponsorId = user.sponsorId?.toString()
      if (!sponsorId) continue
      if (!sponsoredByMap.has(sponsorId)) sponsoredByMap.set(sponsorId, [])
      sponsoredByMap.get(sponsorId)!.push(user)
    }

    const direct:   any[] = []
    const indirect: any[] = []
    const all:      any[] = []
    const visited = new Set<string>()

    const buildItem = async (child: any, level: number) => {
      const { leftAvailablePoints, rightAvailablePoints } =
        await this.getAvailablePoints(child._id)

      return {
        id:                   child._id.toString(),
        userId:               child._id.toString(),
        name:                 child.name ?? '',
        username:             child.username,
        email:                child.email,
        role:                 child.role,
        membershipTier:       child.membershipTier,
        sponsorId:            child.sponsorId?.toString() ?? null,
        referralCode:         child.referralCode ?? '',
        profileImage:         child.profileImage ?? '',
        leftLegPoints:        child.leftLegPoints  ?? 0,
        rightLegPoints:       child.rightLegPoints ?? 0,
        leftAvailablePoints,
        rightAvailablePoints,
        age:                  child.age        ?? null,
        contact:              child.contact    ?? '',
        address:              child.address    ?? '',
        beneficiary:          child.beneficiary ?? '',
        birthday:             child.birthday   ?? '',
        createdAt:            child.createdAt ?? null,
        referralLevel:        level,
        referralType:         level === 1 ? 'direct' : 'indirect',
      }
    }

    const walkSponsorTree = async (sponsorUserId: string, level: number) => {
      const children = sponsoredByMap.get(sponsorUserId) ?? []

      for (const child of children) {
        const childId = child._id.toString()
        if (visited.has(childId)) continue
        visited.add(childId)

        const item = await buildItem(child, level)
        all.push(item)

        if (level === 1) direct.push(item)
        else indirect.push(item)

        await walkSponsorTree(childId, level + 1)
      }
    }

    await walkSponsorTree(rootUserId, 1)

    // Spillover: in genealogy subtree but not directly sponsored by root
    const spillover: any[] = []

    for (const node of downlineNodes) {
      const downlineUserId = node.userId.toString()
      if (downlineUserId === rootUserId) continue

      const user: any = userMap.get(downlineUserId)
      if (!user) continue

      const sponsorId = user.sponsorId?.toString() ?? null
      if (sponsorId === rootUserId) continue // direct referral, not spillover

      const { leftAvailablePoints, rightAvailablePoints } =
        await this.getAvailablePoints(user._id)

      spillover.push({
        id:                   downlineUserId,
        userId:               downlineUserId,
        name:                 user.name ?? '',
        username:             user.username,
        email:                user.email,
        role:                 user.role,
        membershipTier:       user.membershipTier,
        sponsorId,
        referralCode:         user.referralCode ?? '',
        profileImage:         user.profileImage ?? '',
        leftLegPoints:        user.leftLegPoints  ?? 0,
        rightLegPoints:       user.rightLegPoints ?? 0,
        leftAvailablePoints,
        rightAvailablePoints,
        age:                  user.age        ?? null,
        contact:              user.contact    ?? '',
        address:              user.address    ?? '',
        beneficiary:          user.beneficiary ?? '',
        birthday:             user.birthday   ?? '',
        createdAt:            user.createdAt ?? null,
        parentUserId:         node.parentUserId?.toString() ?? null,
        position:             node.position ?? null,
        depth:                node.depth ?? 0,
        referralType:         'spillover',
      })
    }

    return {
      rootUser: {
        id:           rootUser._id.toString(),
        userId:       rootUser._id.toString(),
        name:         (rootUser as any).name ?? '',
        username:     (rootUser as any).username,
        email:        (rootUser as any).email,
        role:         (rootUser as any).role,
        membershipTier: (rootUser as any).membershipTier,
        sponsorId:    (rootUser as any).sponsorId?.toString() ?? null,
        referralCode: (rootUser as any).referralCode ?? '',
      },
      counts: {
        direct:   direct.length,
        indirect: indirect.length,
        spillover: spillover.length,
        total:    all.length,
      },
      direct,
      indirect,
      spillover,
      all,
    }
  }

  // ── Public methods ────────────────────────────────────────────────────────

  async getReferralCounts(userId: string) {
    return this.buildReferralLists(userId)
  }

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
        .findOne({ userId: this.toObjectId(targetUserId) })
        .lean(),
    ])

    if (!rootUser)   throw new NotFoundException('Root user not found')
    if (!targetUser) throw new NotFoundException('Target user not found')

    let current: any = targetUser
    let sponsorLevel = 0
    const sponsorChain: string[] = []
    let isDirectReferral   = false
    let isIndirectReferral = false

    while (current?.sponsorId) {
      sponsorLevel++
      const sponsorId = current.sponsorId.toString()
      sponsorChain.push(sponsorId)

      if (sponsorId === rootUserId) {
        if (sponsorLevel === 1) isDirectReferral   = true
        else                    isIndirectReferral = true
        break
      }

      current = await this.userModel.findById(sponsorId).lean()
      if (!current) break
    }

    const isGenealogyDownline = !!targetNode?.ancestors?.some(
      (ancestorId: any) => ancestorId.toString() === rootUserId,
    )

    const isSpillover =
      isGenealogyDownline &&
      (targetUser as any).sponsorId?.toString() !== rootUserId

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
      sponsorId:    (targetUser as any).sponsorId?.toString() ?? null,
      parentUserId: targetNode?.parentUserId?.toString() ?? null,
      position:     targetNode?.position ?? null,
      depth:        targetNode?.depth ?? 0,
    }
  }

  async getOrCreateRoot(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const user = await this.userModel.findById(userId)
    if (!user) throw new NotFoundException('User not found')

    let node = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    })

    if (!node) {
      node = await this.genealogyModel.create({
        userId:           this.toObjectId(userId),
        parentUserId:     null,
        position:         null,
        leftChildUserId:  null,
        rightChildUserId: null,
        depth:            0,
        ancestors:        [],
      })
    }

    const tree = await this.buildTree(userId)

    if (!tree) throw new NotFoundException('Failed to load genealogy root')

    return tree
  }

  async getTree(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const tree = await this.buildTree(userId)

    if (!tree) throw new NotFoundException('Genealogy tree not found')

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

    if (!parentNode) throw new NotFoundException('Parent genealogy node not found')

    if (dto.leg === GenealogySide.LEFT && parentNode.leftChildUserId) {
      throw new BadRequestException('Left leg already occupied')
    }

    if (dto.leg === GenealogySide.RIGHT && parentNode.rightChildUserId) {
      throw new BadRequestException('Right leg already occupied')
    }

    // ── Validate PIN ──────────────────────────────────────────────────────
    const FREE_STATIC_PIN = 'AB1234'
    const isFreePin = dto.packagePin.trim() === FREE_STATIC_PIN
    let pinDoc: any = null
    let membershipTier: MembershipTier

    if (isFreePin) {
      membershipTier = MembershipTier.FREE
    } else {
      pinDoc = await this.productPinModel.findOne({ pin: dto.packagePin.trim() })
      if (!pinDoc) throw new BadRequestException('Invalid package PIN — PIN does not exist')
      if (pinDoc.status !== PinStatus.UNUSED) {
        throw new BadRequestException(
          `PIN is already ${pinDoc.status.toLowerCase()} and cannot be used`,
        )
      }
      membershipTier = pinDoc.tier
    }

    const placerUser = await this.userModel.findById(dto.placerUserId)
    if (!placerUser) throw new NotFoundException('Placer user not found')

    // ── Create the new user ───────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(dto.password, 10)

    const newUser = await this.usersService.createUser({
      name:           dto.name,
      username:       dto.username,
      email:          dto.email,
      passwordHash,
      membershipTier,
      packagePin:     dto.packagePin.trim(),
      age:            dto.age,
      contact:        dto.contact,
      address:        dto.address,
      beneficiary:    dto.beneficiary,
      birthday:       dto.birthday,
    })

    const newUserId = (newUser as any)._id as Types.ObjectId

    // Set sponsorId to the placer
    await this.userModel.findByIdAndUpdate(newUserId, { $set: { sponsorId: placerUser._id } })

    // ── Mark PIN as USED — rollback user if this fails ────────────────────
    if (!isFreePin && pinDoc) {
      try {
        const updateResult = await this.productPinModel.updateOne(
          { _id: pinDoc._id },
          { $set: { status: PinStatus.USED, usedByUserId: newUserId, usedAt: new Date() } },
        )
        if (updateResult.matchedCount === 0) throw new Error('PIN document not found during update')
      } catch (err: any) {
        await this.userModel.deleteOne({ _id: newUserId })
        throw new BadRequestException(
          'Failed to mark PIN as used — user creation has been rolled back. Please try again.',
        )
      }
    }

    const childNode = await this.genealogyModel.create({
      userId:           newUserId,
      parentUserId:     parentNode.userId,
      position:         dto.leg,
      leftChildUserId:  null,
      rightChildUserId: null,
      depth:            parentNode.depth + 1,
      ancestors:        [...(parentNode.ancestors ?? []), parentNode.userId],
    })

    if (dto.leg === GenealogySide.LEFT) {
      parentNode.leftChildUserId = childNode.userId
    } else {
      parentNode.rightChildUserId = childNode.userId
    }

    await parentNode.save()

    // ── Spillover detection → reset root's indirect counter ──────────────
    const isSpillover = placerUser._id.toString() !== parentNode.userId.toString()
    if (isSpillover && childNode.ancestors.length > 0) {
      const rootUserId = childNode.ancestors[0]
      await this.userModel.findByIdAndUpdate(rootUserId, {
        $set: { indirectResetDepth: childNode.depth },
      })
    }

    // ── Award placement bonuses to all ancestors ──────────────────────────
    await this.awardPlacementBonuses(childNode, membershipTier)

    await this.volumeService.awardActivationVolume(newUserId.toString())

    const { leftAvailablePoints, rightAvailablePoints } =
      await this.getAvailablePoints(newUserId)

    return {
      id:                   newUserId.toString(),
      userId:               newUserId.toString(),
      username:             (newUser as any).username,
      email:                (newUser as any).email,
      profileImage:         (newUser as any).profileImage ?? '',
      referralCode:         (newUser as any).referralCode ?? '',
      sponsorId:            placerUser._id.toString(),
      membershipTier:       (newUser as any).membershipTier,
      leftLegPoints:        0,
      rightLegPoints:       0,
      leftAvailablePoints,
      rightAvailablePoints,
      age:                  (newUser as any).age,
      contact:              (newUser as any).contact,
      address:              (newUser as any).address,
      beneficiary:          (newUser as any).beneficiary,
      birthday:             (newUser as any).birthday,
      parentUserId:         parentNode.userId.toString(),
      leg:                  dto.leg,
    }
  }

  async getChildren(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const node = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    })

    if (!node) throw new NotFoundException('Genealogy node not found')

    const left  = node.leftChildUserId
      ? await this.mapUserToMember(node.leftChildUserId)
      : null

    const right = node.rightChildUserId
      ? await this.mapUserToMember(node.rightChildUserId)
      : null

    return { userId, left, right }
  }

  async getDownlines(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const rootNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    })

    if (!rootNode) throw new NotFoundException('Genealogy node not found')

    const downlineNodes = await this.genealogyModel
      .find({ ancestors: this.toObjectId(userId) })
      .lean()

    const members = await Promise.all(
      downlineNodes.map(async (node: any) => {
        const user = await this.mapUserToMember(node.userId)
        return {
          ...user,
          parentUserId: node.parentUserId?.toString() ?? null,
          position:     node.position ?? null,
          depth:        node.depth    ?? 0,
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

    if (!targetNode) throw new NotFoundException('Target genealogy node not found')

    const isDownline = (targetNode.ancestors ?? []).some(
      (ancestorId) => ancestorId.toString() === sourceUserId,
    )

    return { sourceUserId, targetUserId, isDownline }
  }

  async getSpilloverBonus(userId: string) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const userDoc = await this.userModel.findById(userId).select('membershipTier').lean()
    if (!userDoc || (userDoc as any).membershipTier === MembershipTier.FREE) {
      return {
        userId,
        rootUser: null,
        spilloverCount: 0,
        totalPoints: 0,
        totalBonusPHP: 0,
        pointsPerPHP: 400,
        breakdown: [],
      }
    }

    const { spillover, rootUser } = await this.buildReferralLists(userId)

    if (spillover.length === 0) {
      return {
        userId,
        rootUser,
        spilloverCount: 0,
        totalPoints:    0,
        totalBonusPHP:  0,
        pointsPerPHP:   400,
        breakdown:      [],
      }
    }

    const spilloverUserIds = spillover.map((s) => this.toObjectId(s.userId))

    const ledgerEntries = await this.volumeLedgerModel
      .find({
        ownerUserId:  this.toObjectId(userId),
        sourceUserId: { $in: spilloverUserIds },
      })
      .lean()

    const pointsPerMember = new Map<string, number>()

    for (const entry of ledgerEntries) {
      const sourceId = entry.sourceUserId.toString()
      pointsPerMember.set(sourceId, (pointsPerMember.get(sourceId) ?? 0) + entry.points)
    }

    const breakdown = spillover.map((member) => {
      const points = pointsPerMember.get(member.userId) ?? 0
      return {
        userId:            member.userId,
        name:              member.name,
        username:          member.username,
        membershipTier:    member.membershipTier,
        depth:             member.depth,
        pointsContributed: points,
      }
    })

    return {
      userId,
      rootUser,
      spilloverCount: spillover.length,
      breakdown,
    }
  }

  // ── Per-referral placement bonus ─────────────────────────────────────────

  private async awardPlacementBonuses(
    childNode: { depth: number; ancestors: Types.ObjectId[]; userId: Types.ObjectId },
    membershipTier: MembershipTier,
  ) {
    if (membershipTier === MembershipTier.FREE) return

    for (const ancestorObjId of childNode.ancestors) {
      const ancestorId = ancestorObjId.toString()

      const [ancestor, ancestorNode] = await Promise.all([
        this.userModel
          .findById(ancestorObjId)
          .select('indirectResetDepth')
          .lean(),
        this.genealogyModel
          .findOne({ userId: ancestorObjId })
          .select('depth')
          .lean(),
      ])

      if (!ancestor || !ancestorNode) continue

      const depthDiff = childNode.depth - (ancestorNode as any).depth

      if (depthDiff === 1) {
        const amount = this.DIRECT_BONUS[membershipTier] ?? 0
        if (amount > 0) {
          await this.walletService.credit({
            userId:   ancestorId,
            currency: WalletCurrency.PHP,
            amount,
            source:   WalletTxnSource.REFERRAL_DIRECT,
            refKey:   `ref_direct:${ancestorId}:${childNode.userId}`,
            note:     `Direct placement bonus — ${membershipTier} member placed`,
            meta:     { newMemberId: childNode.userId.toString(), membershipTier, depthDiff },
          })
        }
      } else if (depthDiff >= 2) {
        const resetDepth: number = (ancestor as any).indirectResetDepth ?? 1
        const baseDepth = (ancestorNode as any).depth
        const minDepth  = baseDepth + resetDepth + 1
        const maxDepth  = baseDepth + resetDepth + 5

        if (childNode.depth >= minDepth && childNode.depth <= maxDepth) {
          const amount = this.INDIRECT_BONUS[membershipTier] ?? 0
          if (amount > 0) {
            await this.walletService.credit({
              userId:   ancestorId,
              currency: WalletCurrency.PHP,
              amount,
              source:   WalletTxnSource.REFERRAL_INDIRECT,
              refKey:   `ref_indirect:${ancestorId}:${childNode.userId}`,
              note:     `Indirect placement bonus — ${membershipTier} at depth ${childNode.depth}`,
              meta:     { newMemberId: childNode.userId.toString(), membershipTier, depthDiff, resetDepth },
            })
          }
        }
      }
    }
  }
}