import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { PairingState, PairingStateDocument } from './schemas/pairing-state.schema';
import { PairingAward, PairingAwardDocument } from './schemas/pairing-award.schema';
import { VolumeBucket, VolumeBucketDocument, VolumeLeg } from '../volume/schemas/volume-bucket.schema';
import { User, UserDocument, MembershipTier } from '../users/schemas/user.schema';
import { GenealogyNode, GenealogyNodeDocument } from '../genealogy/schema/genealogy-node.schema';
import { WalletService } from '../wallet/wallet.service';
import { WalletCurrency, WalletTxnSource } from '../wallet/schemas/wallet-transaction.schema';

import { PairingCycle } from './enums/pairing-cycle.enum';
export { PairingCycle };

export interface TryPairResult {
  skipped: boolean;
  reason?: string;
  pairingsMade?: number;
  totalPairedPoints?: number;
  totalPayoutPhp?: number;
  awards?: ReturnType<PairingService['formatAward']>[];
}

@Injectable()
export class PairingService {
  private readonly logger = new Logger(PairingService.name);
  private readonly RATE_PHP_PER_POINT = 400;

  /**
   * Maximum TOTAL pairs per day per membership tier.
   * Bronze = 3, Silver = 16, Gold = 30, Platinum = 50
   */
  private readonly TIER_CAP_MAP: Record<MembershipTier, number> = {
    [MembershipTier.FREE]:     0,
    [MembershipTier.BRONZE]:   3,
    [MembershipTier.SILVER]:   16,
    [MembershipTier.GOLD]:     30,
    [MembershipTier.PLATINUM]: 50,
  };

  constructor(
    @InjectModel(PairingState.name)
    private readonly stateModel: Model<PairingStateDocument>,

    @InjectModel(PairingAward.name)
    private readonly awardModel: Model<PairingAwardDocument>,

    @InjectModel(VolumeBucket.name)
    private readonly bucketModel: Model<VolumeBucketDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(GenealogyNode.name)
    private readonly genealogyNodeModel: Model<GenealogyNodeDocument>,

    private readonly walletService: WalletService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  private todayDateKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getCapForTier(tier: MembershipTier): number {
    return this.TIER_CAP_MAP[tier] ?? this.TIER_CAP_MAP[MembershipTier.BRONZE];
  }

  /**
   * Sum of all pairedPoints for this user today.
   * Used to enforce the daily cap across multiple real-time pairings.
   */
  private async getDailyCapUsed(userId: Types.ObjectId, dateKey: string): Promise<number> {
    const result = await this.awardModel.aggregate([
      {
        $match: {
          userId,
          // periodKey starts with YYYY-MM-DD
          periodKey: { $regex: `^${dateKey}` },
        },
      },
      { $group: { _id: null, total: { $sum: '$pairedPoints' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /**
   * How many pairing records exist for this user today — used to build
   * the sequential periodKey: YYYY-MM-DD-1, YYYY-MM-DD-2, …
   */
  private async getDailySequence(userId: Types.ObjectId, dateKey: string): Promise<number> {
    const count = await this.awardModel.countDocuments({
      userId,
      periodKey: { $regex: `^${dateKey}-` },
    });
    return count + 1;
  }

  // ── Core ─────────────────────────────────────────────────────────────────

  /**
   * PRIMARY ENTRY POINT — call this immediately after crediting any volume
   * points to a user's bucket (left or right).
   *
   * Runs back-to-back pairings in a loop until either:
   *   a) The user's daily cap is exhausted, OR
   *   b) min(leftAvailable, rightAvailable) drops to 0
   *
   * Each loop iteration writes one PairingState + PairingAward + wallet credit.
   * A single call may produce 0, 1, or many pairing records depending on how
   * many points arrived and how much of the daily cap remains.
   */
  async tryPairIfPossible(userIdStr: string): Promise<TryPairResult> {
    const userId   = this.toObjectId(userIdStr);
    const dateKey  = this.todayDateKey();

    // ── Resolve user ────────────────────────────────────────────────────
    const user = await this.userModel
      .findById(userId)
      .select('membershipTier')
      .lean();

    if (!user) {
      return { skipped: true, reason: 'User not found' };
    }

    const tier     = (user as any).membershipTier as MembershipTier ?? MembershipTier.BRONZE;
    const dailyCap = this.getCapForTier(tier);

    const awards: ReturnType<PairingService['formatAward']>[] = [];
    let totalPairedPoints = 0;
    let totalPayoutPhp    = 0;
    let pairingsMade      = 0;

    // ── Drain loop ────────────────────────────────────────────────────
    // Keep pairing until the daily cap is full or points run dry.
    while (true) {
      // Re-fetch daily cap used on each iteration (other async processes may
      // have already consumed some).
      const capUsed      = await this.getDailyCapUsed(userId, dateKey);
      const capRemaining = dailyCap - capUsed;

      if (capRemaining <= 0) {
        this.logger.debug(`[tryPair] ${userIdStr} — daily cap exhausted (${capUsed}/${dailyCap})`);
        break;
      }

      // Re-fetch live bucket values on every pass.
      const [leftBucket, rightBucket] = await Promise.all([
        this.bucketModel.findOne({ ownerUserId: userId, leg: VolumeLeg.LEFT }).lean(),
        this.bucketModel.findOne({ ownerUserId: userId, leg: VolumeLeg.RIGHT }).lean(),
      ]);

      const leftAvailable  = leftBucket?.availablePoints  ?? 0;
      const rightAvailable = rightBucket?.availablePoints ?? 0;
      const pairable       = Math.min(leftAvailable, rightAvailable);

      if (pairable <= 0) {
        this.logger.debug(
          `[tryPair] ${userIdStr} — not enough points on both legs ` +
          `(L=${leftAvailable}, R=${rightAvailable})`,
        );
        break;
      }

      // How many pairs can we do this pass?
      const pairedPoints = Math.min(pairable, capRemaining);
      const leftCarryOut = leftAvailable  - pairedPoints;
      const rightCarryOut = rightAvailable - pairedPoints;

      // Increment GC pairing counter; every 5th pair gives 1 GC instead of PHP
      const freshUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $inc: { gcPairingCounter: 1 } },
          { new: true },
        )
        .select('gcPairingCounter')
        .lean();
      // Counter is divisible by 5 on every 5th pair
      const isGcPair = ((freshUser as any)?.gcPairingCounter ?? 0) % 5 === 0;
      const payoutPhp = isGcPair ? 0 : pairedPoints * this.RATE_PHP_PER_POINT;
      const gcAwarded = isGcPair ? 1 : 0;

      // Sequential periodKey: YYYY-MM-DD-1, YYYY-MM-DD-2, …
      const seq       = await this.getDailySequence(userId, dateKey);
      const periodKey = `${dateKey}-${seq}`;

      // ── Deduct paired points ───────────────────────────────────────
      await Promise.all([
        this.bucketModel.updateOne(
          { ownerUserId: userId, leg: VolumeLeg.LEFT },
          { $set: { availablePoints: leftCarryOut } },
        ),
        this.bucketModel.updateOne(
          { ownerUserId: userId, leg: VolumeLeg.RIGHT },
          { $set: { availablePoints: rightCarryOut } },
        ),
      ]);

      // ── Save state + award ─────────────────────────────────────────
      const [state, award] = await Promise.all([
        this.stateModel.create({
          userId,
          periodKey,
          // No longer AM/PM — we label each real-time pairing by sequence
          cycle: `SEQ-${seq}`,
          membershipTier: tier,
          capLimit: dailyCap,
          capUsed: capUsed + pairedPoints,
          leftAvailable,
          rightAvailable,
          pairedPoints,
          payoutPhp,
          leftCarryOut,
          rightCarryOut,
        }),
        this.awardModel.create({
          userId,
          periodKey,
          cycle: `SEQ-${seq}`,
          membershipTier: tier,
          pairedPoints,
          payoutPhp,
          ratePhpPerPoint: this.RATE_PHP_PER_POINT,
          capLimit: dailyCap,
          gcAwarded,
        }),
      ]);

      // ── Credit wallet ──────────────────────────────────────────────
      if (isGcPair) {
        // 5th pair: award 1 GC instead of PHP
        await this.walletService.credit({
          userId: userIdStr,
          currency: WalletCurrency.GC_POINTS,
          amount: 1,
          source: WalletTxnSource.PAIRING,
          refKey: `pairing:gc:${userIdStr}:${periodKey}`,
          note: `GC reward — seq ${seq} (${dateKey}) | every 5th pair`,
          meta: {
            periodKey,
            seq,
            membershipTier: tier,
            pairedPoints,
            capLimit: dailyCap,
            capUsed: capUsed + pairedPoints,
            leftAvailable,
            rightAvailable,
            leftCarryOut,
            rightCarryOut,
          },
        });
      } else if (payoutPhp > 0) {
        await this.walletService.credit({
          userId: userIdStr,
          currency: WalletCurrency.PHP,
          amount: payoutPhp,
          source: WalletTxnSource.PAIRING,
          refKey: `pairing:${userIdStr}:${periodKey}`,
          note:
            `Pairing bonus — seq ${seq} (${dateKey}) | ` +
            `${pairedPoints} pts × ₱${this.RATE_PHP_PER_POINT}`,
          meta: {
            periodKey,
            seq,
            membershipTier: tier,
            pairedPoints,
            capLimit: dailyCap,
            capUsed: capUsed + pairedPoints,
            ratePhpPerPoint: this.RATE_PHP_PER_POINT,
            leftAvailable,
            rightAvailable,
            leftCarryOut,
            rightCarryOut,
          },
        });
      }

      const formattedAward = this.formatAward(award.toObject());
      awards.push(formattedAward);
      totalPairedPoints += pairedPoints;
      totalPayoutPhp    += payoutPhp;
      pairingsMade++;

      this.logger.log(
        `[tryPair] ${userIdStr} seq=${seq} — ` +
        `${pairedPoints} pts paired → ₱${payoutPhp} | ` +
        `cap ${capUsed + pairedPoints}/${dailyCap} | ` +
        `carry L=${leftCarryOut} R=${rightCarryOut}`,
      );
    }

    if (pairingsMade === 0) {
      return {
        skipped: true,
        reason: 'No pairs possible (cap full or insufficient points)',
      };
    }

    return {
      skipped: false,
      pairingsMade,
      totalPairedPoints,
      totalPayoutPhp,
      awards,
    };
  }

  // ── Manual / admin trigger ────────────────────────────────────────────────

  /**
   * Manually trigger pairing for a user (admin panel / testing).
   * Delegates to tryPairIfPossible — same logic.
   */
  async runPairing(userIdStr: string, _cycle?: PairingCycle, _dateKey?: string) {
    return this.tryPairIfPossible(userIdStr);
  }

  // ── Query helpers ─────────────────────────────────────────────────────────

  async getState(userIdStr: string, periodKey: string) {
    const userId = this.toObjectId(userIdStr);
    const [state, award] = await Promise.all([
      this.stateModel.findOne({ userId, periodKey }).lean(),
      this.awardModel.findOne({ userId, periodKey }).lean(),
    ]);
    return {
      periodKey,
      state: state ? this.formatState(state) : null,
      award: award ? this.formatAward(award) : null,
    };
  }

  async getDayState(userIdStr: string, dateKey: string) {
    const userId = this.toObjectId(userIdStr);

    const [states, awards] = await Promise.all([
      this.stateModel
        .find({ userId, periodKey: { $regex: `^${dateKey}-` } })
        .sort({ createdAt: 1 })
        .lean(),
      this.awardModel
        .find({ userId, periodKey: { $regex: `^${dateKey}-` } })
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    const totalPayoutPhp = awards.reduce((sum, a) => sum + (a.payoutPhp ?? 0), 0);
    const totalPaired    = awards.reduce((sum, a) => sum + (a.pairedPoints ?? 0), 0);

    return {
      dateKey,
      pairings: awards.map((award) => ({
        periodKey: award.periodKey,
        award: this.formatAward(award),
        state: this.formatState(
          states.find((s) => s.periodKey === award.periodKey) ?? {},
        ),
      })),
      totalPairedPoints: totalPaired,
      totalPayoutPhp,
    };
  }

  // ── Downline History ─────────────────────────────────────────────────────

  async getDownlineHistory(rootUserIdStr: string, limit = 100) {
    const rootUserId = this.toObjectId(rootUserIdStr);

    const downlineNodes = await this.genealogyNodeModel
      .find({ ancestors: rootUserId })
      .select('userId depth position')
      .lean();

    if (downlineNodes.length === 0) return [];

    const depthMap = new Map<string, { depth: number; position: string | null }>();
    const downlineUserIds: Types.ObjectId[] = [];

    for (const node of downlineNodes) {
      const uid = (node as any).userId.toString();
      depthMap.set(uid, { depth: (node as any).depth, position: (node as any).position ?? null });
      downlineUserIds.push((node as any).userId);
    }

    const awards = await this.awardModel
      .find({ userId: { $in: downlineUserIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (awards.length === 0) return [];

    const uniqueUserIds = [...new Set(awards.map((a) => a.userId.toString()))];
    const users = await this.userModel
      .find({ _id: { $in: uniqueUserIds.map((id) => new Types.ObjectId(id)) } })
      .select('username membershipTier')
      .lean();

    const userMap = new Map<string, any>(
      (users as any[]).map((u) => [u._id.toString(), u]),
    );

    return awards.map((award) => {
      const uid = award.userId.toString();
      const user = userMap.get(uid);
      const genealogy = depthMap.get(uid);
      return {
        award: this.formatAward(award),
        username: user?.username ?? uid,
        membershipTier: user?.membershipTier ?? award.membershipTier,
        depth: genealogy?.depth ?? 0,
        position: genealogy?.position ?? null,
      };
    });
  }

  // ── History ───────────────────────────────────────────────────────────────

  async getHistory(userIdStr: string, limit = 50) {
    const userId = this.toObjectId(userIdStr);

    const [awards, states] = await Promise.all([
      this.awardModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      this.stateModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const stateMap = new Map<string, any>(
      states.map((s) => [s.periodKey, s]),
    );

    return awards.map((award) => {
      const state = stateMap.get(award.periodKey);
      return {
        award: this.formatAward(award),
        state: state ? this.formatState(state) : null,
      };
    });
  }

  // ── Formatters ────────────────────────────────────────────────────────────

  formatState(s: any) {
    return {
      id:             s._id?.toString?.() ?? s._id,
      userId:         s.userId?.toString(),
      periodKey:      s.periodKey,
      cycle:          s.cycle,
      membershipTier: s.membershipTier,
      capLimit:       s.capLimit,
      capUsed:        s.capUsed,
      leftAvailable:  s.leftAvailable,
      rightAvailable: s.rightAvailable,
      pairedPoints:   s.pairedPoints,
      payoutPhp:      s.payoutPhp,
      leftCarryOut:   s.leftCarryOut,
      rightCarryOut:  s.rightCarryOut,
      createdAt:      s.createdAt,
    };
  }

  formatAward(a: any) {
    return {
      id:              a._id?.toString?.() ?? a._id,
      userId:          a.userId?.toString(),
      periodKey:       a.periodKey,
      cycle:           a.cycle,
      membershipTier:  a.membershipTier,
      pairedPoints:    a.pairedPoints,
      payoutPhp:       a.payoutPhp,
      ratePhpPerPoint: a.ratePhpPerPoint,
      capLimit:        a.capLimit,
      gcAwarded:       a.gcAwarded ?? 0,
      createdAt:       a.createdAt,
    };
  }
}