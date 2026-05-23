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
  SystemRole,
  User,
  UserDocument,
} from '../users/schemas/user.schema'
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
      sponsorId:            (user as any).sponsorId?.toString() ?? null,
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
      createdAt:            (user as any).createdAt  ?? null,
    }
  }

  // ── Tree builder ──────────────────────────────────────────────────────────

  private async buildTree(userId: string, maxDepth = 3, currentDepth = 0): Promise<any> {
    const node = await this.genealogyModel.findOne({
      userId: this.toObjectId(userId),
    })

    if (!node) return null

    const member = await this.mapUserToMember(node.userId)
    if (!member) return null

    if (currentDepth >= maxDepth) {
      return {
        ...member,
        hasLeftChild:  !!node.leftChildUserId,
        hasRightChild: !!node.rightChildUserId,
      }
    }

    const [leftChild, rightChild] = await Promise.all([
      node.leftChildUserId
        ? this.buildTree(node.leftChildUserId.toString(),  maxDepth, currentDepth + 1)
        : Promise.resolve(undefined),
      node.rightChildUserId
        ? this.buildTree(node.rightChildUserId.toString(), maxDepth, currentDepth + 1)
        : Promise.resolve(undefined),
    ])

    return { ...member, leftChild, rightChild }
  }

  // ── Referral lists ────────────────────────────────────────────────────────

  /**
   * direct referral  = sponsorId === rootUserId (regardless of tree position)
   * indirect referral = in genealogy downline tree AND sponsorId !== rootUserId
   */
  private async buildReferralLists(rootUserId: string) {
    if (!this.isValidObjectId(rootUserId)) {
      throw new BadRequestException('Invalid userId')
    }

    const rootObjectId = this.toObjectId(rootUserId)

    const rootUser = await this.userModel.findById(rootObjectId).lean()
    if (!rootUser) throw new NotFoundException('User not found')

    const [directUsers, downlineNodes] = await Promise.all([
      this.userModel
        .find(
          { sponsorId: rootObjectId },
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

    const directUserIds = new Set(directUsers.map((u: any) => u._id.toString()))

    const buildItem = async (user: any, referralType: 'direct' | 'indirect') => {
      const { leftAvailablePoints, rightAvailablePoints } =
        await this.getAvailablePoints(user._id)

      return {
        id:                   user._id.toString(),
        userId:               user._id.toString(),
        name:                 user.name ?? '',
        username:             user.username,
        email:                user.email,
        role:                 user.role,
        membershipTier:       user.membershipTier,
        sponsorId:            user.sponsorId?.toString() ?? null,
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
        referralLevel:        referralType === 'direct' ? 1 : 2,
        referralType,
      }
    }

    const direct: any[] = await Promise.all(
      directUsers.map((u: any) => buildItem(u, 'direct')),
    )

    // Candidates: downline members that are not root and not direct referrals.
    const candidateIds = downlineNodes
      .filter((node: any) => {
        const nodeUserId = node.userId.toString()
        return nodeUserId !== rootUserId && !directUserIds.has(nodeUserId)
      })
      .map((node: any) => node.userId)

    // Fetch sponsorId for each candidate from the User model.
    const candidateUsers = candidateIds.length > 0
      ? await this.userModel
          .find({ _id: { $in: candidateIds } }, { sponsorId: 1 })
          .lean()
      : []
    const candidateSponsorMap = new Map<string, string>(
      candidateUsers.map((u: any) => [u._id.toString(), u.sponsorId?.toString() ?? '']),
    )

    // Build sponsor network via BFS: start from root + direct referrals, then expand
    // to any candidate whose sponsorId is already in the network. This correctly
    // excludes spillover descendants whose sponsor chain does not trace back to root.
    const sponsorNetworkIds = new Set<string>([rootUserId, ...directUserIds])
    let changed = true
    while (changed) {
      changed = false
      for (const [id, sponsorId] of candidateSponsorMap) {
        if (!sponsorNetworkIds.has(id) && sponsorNetworkIds.has(sponsorId)) {
          sponsorNetworkIds.add(id)
          changed = true
        }
      }
    }

    // Indirect: candidate whose sponsorId traces back to root through the sponsor chain.
    const indirectUserIds = candidateIds.filter((id: any) => {
      const sponsorId = candidateSponsorMap.get(id.toString()) ?? ''
      return sponsorNetworkIds.has(sponsorId)
    })

    const indirectUsers = indirectUserIds.length > 0
      ? await this.userModel
          .find(
            { _id: { $in: indirectUserIds } },
            {
              name: 1, username: 1, email: 1, role: 1,
              membershipTier: 1, sponsorId: 1, referralCode: 1,
              profileImage: 1, leftLegPoints: 1, rightLegPoints: 1,
              age: 1, contact: 1, address: 1, beneficiary: 1, birthday: 1,
              createdAt: 1,
            },
          )
          .lean()
      : []

    const indirect: any[] = await Promise.all(
      indirectUsers.map((u: any) => buildItem(u, 'indirect')),
    )

    const all = [...direct, ...indirect]

    return {
      rootUser: {
        id:             (rootUser as any)._id.toString(),
        userId:         (rootUser as any)._id.toString(),
        name:           (rootUser as any).name ?? '',
        username:       (rootUser as any).username,
        email:          (rootUser as any).email,
        role:           (rootUser as any).role,
        membershipTier: (rootUser as any).membershipTier,
        sponsorId:      (rootUser as any).sponsorId?.toString() ?? null,
        referralCode:   (rootUser as any).referralCode ?? '',
      },
      counts: {
        direct:   direct.length,
        indirect: indirect.length,
        total:    all.length,
      },
      direct,
      indirect,
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
        isGenealogyDownline: false,
        sponsorId: null,
        parentUserId: null,
        position: null,
        depth: 0,
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

    const isDirectReferral = (targetUser as any).sponsorId?.toString() === rootUserId

    const isGenealogyDownline = !!targetNode?.ancestors?.some(
      (ancestorId: any) => ancestorId.toString() === rootUserId,
    )

    const isIndirectReferral = isGenealogyDownline && !isDirectReferral

    return {
      rootUserId,
      targetUserId,
      related:             isDirectReferral || isIndirectReferral,
      isDirectReferral,
      isIndirectReferral,
      isGenealogyDownline,
      sponsorId:    (targetUser as any).sponsorId?.toString() ?? null,
      parentUserId: targetNode?.parentUserId?.toString() ?? null,
      position:     targetNode?.position ?? null,
      depth:        targetNode?.depth ?? 0,
    }
  }

  async getOrCreateRoot(userId: string, maxDepth = 3) {
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

    const tree = await this.buildTree(userId, maxDepth)

    if (!tree) throw new NotFoundException('Failed to load genealogy root')

    return tree
  }

  async getTree(userId: string, maxDepth = 3) {
    if (!this.isValidObjectId(userId)) {
      throw new BadRequestException('Invalid userId')
    }

    const tree = await this.buildTree(userId, maxDepth)

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
      const leftUserExists = await this.userModel.exists({ _id: parentNode.leftChildUserId })
      if (leftUserExists) {
        throw new BadRequestException('Cannot place member, slot already occupied')
      }
      await this.genealogyModel.deleteOne({ userId: parentNode.leftChildUserId })
      parentNode.leftChildUserId = null as any
      await parentNode.save()
    }

    if (dto.leg === GenealogySide.RIGHT && parentNode.rightChildUserId) {
      const rightUserExists = await this.userModel.exists({ _id: parentNode.rightChildUserId })
      if (rightUserExists) {
        throw new BadRequestException('Cannot place member, slot already occupied')
      }
      await this.genealogyModel.deleteOne({ userId: parentNode.rightChildUserId })
      parentNode.rightChildUserId = null as any
      await parentNode.save()
    }

    // ── Validate PIN ──────────────────────────────────────────────────────
    const FREE_STATIC_PIN = 'AB1234'
    const isLegacyFreePin = dto.packagePin.trim() === FREE_STATIC_PIN
    let pinDoc: any = null
    let membershipTier: MembershipTier
    let isFreeAccount = false

    if (isLegacyFreePin) {
      membershipTier = MembershipTier.FREE
      isFreeAccount = true
    } else {
      pinDoc = await this.productPinModel.findOne({ pin: dto.packagePin.trim() })
      if (!pinDoc) throw new BadRequestException('Invalid package PIN — PIN does not exist')
      if (pinDoc.status !== PinStatus.UNUSED) {
        throw new BadRequestException(
          `PIN is already ${pinDoc.status.toLowerCase()} and cannot be used`,
        )
      }
      membershipTier = pinDoc.tier
      isFreeAccount = pinDoc.isFree ?? false
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

    // Set sponsorId and isFree flag on the user
    const userUpdateFields: any = { sponsorId: placerUser._id }
    if (isFreeAccount) userUpdateFields.isFree = true
    await this.userModel.findByIdAndUpdate(newUserId, { $set: userUpdateFields })

    // ── Mark PIN as USED — rollback user if this fails ────────────────────
    if (!isLegacyFreePin && pinDoc) {
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

    // ── Award placement bonuses — run both in parallel ────────────────────
    await Promise.all([
      this.awardPlacementBonuses(childNode, membershipTier, isFreeAccount, placerUser._id.toString()),
      this.volumeService.awardActivationVolume(newUserId.toString()),
    ])

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

  // ── Per-referral placement bonus ─────────────────────────────────────────

  private async awardPlacementBonuses(
    childNode: { depth: number; ancestors: Types.ObjectId[]; userId: Types.ObjectId },
    membershipTier: MembershipTier,
    isFreeAccount: boolean,
    sponsorUserId: string,
  ) {
    if (membershipTier === MembershipTier.FREE || isFreeAccount) return

    // Resolve the sponsor's tree depth so we can exclude ancestors that sit
    // *between* the new member and the sponsor (spillover intermediaries).
    // Indirect bonuses only flow to ancestors who are ABOVE the sponsor.
    const sponsorGenealogyNode = await this.genealogyModel
      .findOne({ userId: this.toObjectId(sponsorUserId) })
      .select('depth')
      .lean()
    const sponsorTreeDepth: number = (sponsorGenealogyNode as any)?.depth ?? -1

    // If the sponsor is not a tree ancestor of the new member (pure spillover),
    // award their direct bonus here before the ancestor loop.
    const sponsorIsAncestor = childNode.ancestors.some(
      (a) => a.toString() === sponsorUserId,
    )

    const sponsorUser = await this.userModel
      .findById(this.toObjectId(sponsorUserId))
      .select('isFree membershipTier')
      .lean()
    const sponsorIsFree =
      (sponsorUser as any)?.isFree ||
      (sponsorUser as any)?.membershipTier === MembershipTier.FREE

    if (!sponsorIsAncestor && !sponsorIsFree) {
      const amount = this.DIRECT_BONUS[membershipTier] ?? 0
      if (amount > 0) {
        await this.walletService.credit({
          userId:   sponsorUserId,
          currency: WalletCurrency.PHP,
          amount,
          source:   WalletTxnSource.REFERRAL_DIRECT,
          refKey:   `ref_direct:${sponsorUserId}:${childNode.userId}`,
          note:     `Direct placement bonus — ${membershipTier} member placed`,
          meta:     { newMemberId: childNode.userId.toString(), membershipTier },
        })
      }
    }

    // Each ancestor is independent — process all in parallel
    await Promise.all(
      childNode.ancestors.map(async (ancestorObjId) => {
        const ancestorId = ancestorObjId.toString()

        const [ancestor, ancestorNode] = await Promise.all([
          this.userModel
            .findById(ancestorObjId)
            .select('countedIndirectDepths isFree membershipTier')
            .lean(),
          this.genealogyModel
            .findOne({ userId: ancestorObjId })
            .select('depth')
            .lean(),
        ])

        if (!ancestor || !ancestorNode) return
        if ((ancestor as any).isFree || (ancestor as any).membershipTier === MembershipTier.FREE) return

        const depthDiff       = childNode.depth - (ancestorNode as any).depth
        const isDirectRecruit = sponsorUserId === ancestorId

        if (isDirectRecruit) {
          const amount = this.DIRECT_BONUS[membershipTier] ?? 0
          await Promise.all([
            this.userModel.findByIdAndUpdate(ancestorObjId, {
              $set: { countedIndirectDepths: [] },
            }),
            amount > 0
              ? this.walletService.credit({
                  userId:   ancestorId,
                  currency: WalletCurrency.PHP,
                  amount,
                  source:   WalletTxnSource.REFERRAL_DIRECT,
                  refKey:   `ref_direct:${ancestorId}:${childNode.userId}`,
                  note:     `Direct placement bonus — ${membershipTier} member placed`,
                  meta:     { newMemberId: childNode.userId.toString(), membershipTier, depthDiff },
                })
              : Promise.resolve(),
          ])
        } else if (
          depthDiff >= 2 &&
          (ancestorNode as any).depth < sponsorTreeDepth
        ) {
          // Only grant indirect bonus to ancestors that are above the sponsor
          // in the tree. Ancestors between the new member and the sponsor are
          // spillover intermediaries and should not receive any bonus.
          const relativeDepth  = depthDiff
          const countedDepths: number[] = (ancestor as any).countedIndirectDepths ?? []
          const alreadyCounted = countedDepths.includes(relativeDepth)
          const canAddNewDepth = countedDepths.length < 5

          if (!alreadyCounted && !canAddNewDepth) return  // 6th+ unseen depth — blocked

          const amount = this.INDIRECT_BONUS[membershipTier] ?? 0
          await Promise.all([
            !alreadyCounted
              ? this.userModel.findByIdAndUpdate(ancestorObjId, {
                  $addToSet: { countedIndirectDepths: relativeDepth },
                })
              : Promise.resolve(),
            amount > 0
              ? this.walletService.credit({
                  userId:   ancestorId,
                  currency: WalletCurrency.PHP,
                  amount,
                  source:   WalletTxnSource.REFERRAL_INDIRECT,
                  refKey:   `ref_indirect:${ancestorId}:${childNode.userId}`,
                  note:     `Indirect placement bonus — ${membershipTier} at relative depth ${relativeDepth}`,
                  meta:     { newMemberId: childNode.userId.toString(), membershipTier, depthDiff, relativeDepth, countedDepthsCount: countedDepths.length + (alreadyCounted ? 0 : 1) },
                })
              : Promise.resolve(),
          ])
        }
      }),
    )
  }

  // ── Search unplaced members ───────────────────────────────────────────────

  async searchUnplaced(q: string) {
    if (!q || q.trim().length === 0) return []

    const regex = new RegExp(q.trim(), 'i')

    const users = await this.userModel
      .find({
        role: SystemRole.USER,
        $or: [
          { username: regex },
          { email:    regex },
          { referralCode: regex },
        ],
      })
      .select('_id username email referralCode profileImage membershipTier')
      .limit(20)
      .lean()

    if (users.length === 0) return []

    // Filter out users who already have a genealogy node
    const userIds = users.map((u: any) => u._id)
    const existingNodes = await this.genealogyModel
      .find({ userId: { $in: userIds } })
      .select('userId')
      .lean()

    const placedIds = new Set(existingNodes.map((n: any) => n.userId.toString()))

    return users
      .filter((u: any) => !placedIds.has(u._id.toString()))
      .map((u: any) => ({
        id:             u._id.toString(),
        userId:         u._id.toString(),
        username:       u.username,
        email:          u.email,
        referralCode:   u.referralCode ?? '',
        profileImage:   u.profileImage ?? '',
        membershipTier: u.membershipTier ?? null,
      }))
  }

  // ── Place an existing (already-created) user into the tree ───────────────

  async placeExistingMember(dto: {
    parentUserId:     string
    leg:              GenealogySide
    placerUserId:     string
    existingMemberId: string
  }) {
    for (const [field, value] of Object.entries({
      parentUserId:     dto.parentUserId,
      placerUserId:     dto.placerUserId,
      existingMemberId: dto.existingMemberId,
    })) {
      if (!this.isValidObjectId(value)) {
        throw new BadRequestException(`Invalid ${field}`)
      }
    }

    // Load parent node
    const parentNode = await this.genealogyModel.findOne({
      userId: this.toObjectId(dto.parentUserId),
    })
    if (!parentNode) throw new NotFoundException('Parent genealogy node not found')

    if (dto.leg === GenealogySide.LEFT && parentNode.leftChildUserId) {
      const leftUserExists = await this.userModel.exists({ _id: parentNode.leftChildUserId })
      if (leftUserExists) {
        throw new BadRequestException('Cannot place member, slot already occupied')
      }
      await this.genealogyModel.deleteOne({ userId: parentNode.leftChildUserId })
      parentNode.leftChildUserId = null as any
      await parentNode.save()
    }
    if (dto.leg === GenealogySide.RIGHT && parentNode.rightChildUserId) {
      const rightUserExists = await this.userModel.exists({ _id: parentNode.rightChildUserId })
      if (rightUserExists) {
        throw new BadRequestException('Cannot place member, slot already occupied')
      }
      await this.genealogyModel.deleteOne({ userId: parentNode.rightChildUserId })
      parentNode.rightChildUserId = null as any
      await parentNode.save()
    }

    // Validate placer
    const placerUser = await this.userModel.findById(dto.placerUserId)
    if (!placerUser) throw new NotFoundException('Placer user not found')

    // Load the existing user
    const existingUser = await this.userModel.findById(dto.existingMemberId)
    if (!existingUser) throw new NotFoundException('Existing user not found')

    // Guard: must not already be in the tree
    const alreadyPlaced = await this.genealogyModel.findOne({
      userId: this.toObjectId(dto.existingMemberId),
    })
    if (alreadyPlaced) {
      throw new BadRequestException('This user is already placed in the genealogy tree')
    }

    const existingUserId = (existingUser as any)._id as Types.ObjectId

    // Set the placer as the direct referrer (sponsor)
    await this.userModel.findByIdAndUpdate(existingUserId, {
      $set: { sponsorId: placerUser._id },
    })

    // Create the genealogy node
    const childNode = await this.genealogyModel.create({
      userId:           existingUserId,
      parentUserId:     parentNode.userId,
      position:         dto.leg,
      leftChildUserId:  null,
      rightChildUserId: null,
      depth:            parentNode.depth + 1,
      ancestors:        [...(parentNode.ancestors ?? []), parentNode.userId],
    })

    // Link the child into the parent node
    if (dto.leg === GenealogySide.LEFT) {
      parentNode.leftChildUserId = childNode.userId
    } else {
      parentNode.rightChildUserId = childNode.userId
    }
    await parentNode.save()

    const membershipTier = (existingUser as any).membershipTier as MembershipTier
    const isFreeExisting = (existingUser as any).isFree ?? false
    await Promise.all([
      this.awardPlacementBonuses(childNode, membershipTier, isFreeExisting, placerUser._id.toString()),
      this.volumeService.awardActivationVolume(existingUserId.toString()),
    ])

    const { leftAvailablePoints, rightAvailablePoints } =
      await this.getAvailablePoints(existingUserId)

    return {
      id:                   existingUserId.toString(),
      userId:               existingUserId.toString(),
      username:             (existingUser as any).username,
      email:                (existingUser as any).email,
      profileImage:         (existingUser as any).profileImage ?? '',
      referralCode:         (existingUser as any).referralCode ?? '',
      sponsorId:            placerUser._id.toString(),
      membershipTier,
      leftLegPoints:        (existingUser as any).leftLegPoints  ?? 0,
      rightLegPoints:       (existingUser as any).rightLegPoints ?? 0,
      leftAvailablePoints,
      rightAvailablePoints,
      parentUserId:         parentNode.userId.toString(),
      leg:                  dto.leg,
    }
  }
}