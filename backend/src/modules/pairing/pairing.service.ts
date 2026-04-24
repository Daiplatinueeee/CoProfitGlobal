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
  /** Points flushed from left side beyond what was paired (safety-net discard) */
  leftFlushed?: number;
  /** Points flushed from right side beyond what was paired (safety-net discard) */
  rightFlushed?: number;
  awards?: ReturnType<PairingService['formatAward']>[];
}

@Injectable()
export class PairingService {
  private readonly logger = new Logger(PairingService.name);
  private readonly RATE_PHP_PER_POINT = 400;

  /**
   * Maximum TOTAL pairs per day per membership tier (the "safety net").
   * Bronze = 3, Silver = 16, Gold = 30, Platinum = 50
   *
   * When a pairing fires, any points on either side that exceed this limit
   * are flushed to 0 — they do NOT carry over.
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

  private getCurrentCycle(): PairingCycle {
    return new Date().getHours() < 12 ? PairingCycle.AM : PairingCycle.PM;
  }

  private getCapForTier(tier: MembershipTier): number {
    return this.TIER_CAP_MAP[tier] ?? this.TIER_CAP_MAP[MembershipTier.BRONZE];
  }

  /**
   * Sum of all pairedPoints for this user in the current cycle (AM or PM).
   * Used to enforce the per-cycle cap so each 12-hour window gets a fresh limit.
   */
  private async getDailyCapUsed(userId: Types.ObjectId, cyclePeriodPrefix: string): Promise<number> {
    const result = await this.awardModel.aggregate([
      {
        $match: {
          userId,
          periodKey: { $regex: `^${cyclePeriodPrefix}` },
        },
      },
      { $group: { _id: null, total: { $sum: '$pairedPoints' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /**
   * How many pairing records exist for this user in the current cycle — used to
   * build the sequential periodKey: YYYY-MM-DD-AM-1, YYYY-MM-DD-AM-2, …
   * Sequence restarts at 1 each cycle.
   */
  private async getDailySequence(userId: Types.ObjectId, cyclePeriodPrefix: string): Promise<number> {
    const count = await this.awardModel.countDocuments({
      userId,
      periodKey: { $regex: `^${cyclePeriodPrefix}-` },
    });
    return count + 1;
  }

  // ── Core ─────────────────────────────────────────────────────────────────

  /**
   * PRIMARY ENTRY POINT — call this immediately after crediting any volume
   * points to a user's bucket (left or right), or from the scheduler sweep.
   *
   * PAIRING RULES:
   *  1. If EITHER side is 0, do nothing — points held until next cycle.
   *  2. If BOTH sides have points, a pairing event fires unconditionally:
   *       a) Cap remaining > 0  → pairedPoints = min(both, capRemaining)
   *                               payout issued, BOTH buckets → 0
   *       b) Cap exhausted (=0) → pairedPoints = 0, no payout
   *                               BOTH buckets still → 0 (safety-net discard)
   *  3. The cap resets at each AM/PM cycle flush (scheduler).
   *
   * FLUSH RULES — only ONE side being empty keeps points alive:
   *
   *   left=3, right=5, cap=3  → pairedPoints=3  → L→0  R→0  (2 flushed from R)
   *   left=7, right=1, cap=3  → pairedPoints=1  → L→0  R→0  (6 flushed from L)
   *   left=7, right=1, cap=0  → cap exhausted   → L→0  R→0  (all flushed, no payout)
   *   left=0, right=5, cap=3  → one side empty  → R stays 5 (held for next cycle)
   */
  async tryPairIfPossible(userIdStr: string): Promise<TryPairResult> {
    const userId            = this.toObjectId(userIdStr);
    const dateKey           = this.todayDateKey();
    const currentCycle      = this.getCurrentCycle();
    const cyclePeriodPrefix = `${dateKey}-${currentCycle}`;

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

    // ── Fetch live bucket values ─────────────────────────────────────────
    // Must happen BEFORE the cap check so we can flush even when cap=0.
    const [leftBucket, rightBucket] = await Promise.all([
      this.bucketModel.findOne({ ownerUserId: userId, leg: VolumeLeg.LEFT }).lean(),
      this.bucketModel.findOne({ ownerUserId: userId, leg: VolumeLeg.RIGHT }).lean(),
    ]);

    const leftAvailable  = leftBucket?.availablePoints  ?? 0;
    const rightAvailable = rightBucket?.availablePoints ?? 0;

    // ── One side empty → hold points, nothing to pair ───────────────────
    // Points are only preserved when there is genuinely nothing to pair.
    // Once BOTH sides have points the flush fires regardless of cap status.
    const pairable = Math.min(leftAvailable, rightAvailable);

    if (pairable <= 0) {
      this.logger.debug(
        `[tryPair] ${userIdStr} — one side empty, holding points | L=${leftAvailable} R=${rightAvailable}`,
      );
      return {
        skipped: true,
        reason: 'Insufficient points on one or both sides — points held for next cycle',
      };
    }

    // ── Cap check — AFTER the empty-side guard ───────────────────────────
    // Both sides have points so a pairing event is occurring.
    // If the cap is exhausted, we still flush both buckets to 0 —
    // excess points above the safety net are discarded, no payout issued.
    const capUsed      = await this.getDailyCapUsed(userId, cyclePeriodPrefix);
    const capRemaining = dailyCap - capUsed;

    if (capRemaining <= 0) {
      this.logger.debug(
        `[tryPair] ${userIdStr} — cap exhausted (${capUsed}/${dailyCap}), ` +
        `flushing L=${leftAvailable} R=${rightAvailable} to 0 — no payout`,
      );

      // Flush both buckets — no payout, no award record
      await Promise.all([
        this.bucketModel.updateOne(
          { ownerUserId: userId, leg: VolumeLeg.LEFT },
          { $set: { availablePoints: 0 } },
        ),
        this.bucketModel.updateOne(
          { ownerUserId: userId, leg: VolumeLeg.RIGHT },
          { $set: { availablePoints: 0 } },
        ),
      ]);

      return {
        skipped:           false,
        pairingsMade:      0,
        totalPairedPoints: 0,
        totalPayoutPhp:    0,
        leftFlushed:       leftAvailable,
        rightFlushed:      rightAvailable,
        awards:            [],
      };
    }

    // ── Calculate pairedPoints (capped by remaining safety net) ─────────
    const pairedPoints = Math.min(pairable, capRemaining);

    // Every 5th paired point → 1 GC (that point does not pay PHP).
    const gcAwarded = Math.floor(pairedPoints / 5);
    const phpPoints = pairedPoints - gcAwarded;
    const payoutPhp = phpPoints * this.RATE_PHP_PER_POINT;

    // Points discarded on each side beyond what was paired
    const leftFlushed  = leftAvailable  - pairedPoints; // always >= 0
    const rightFlushed = rightAvailable - pairedPoints; // always >= 0

    const seq       = await this.getDailySequence(userId, cyclePeriodPrefix);
    const periodKey = `${cyclePeriodPrefix}-${seq}`;

    // ── SAFETY-NET FLUSH: set BOTH buckets to 0 ─────────────────────────
    //
    // When pairing fires, any remainder beyond the paired amount is discarded.
    // Points only survive across cycles when NO pairing occurs (one side empty).
    await Promise.all([
      this.bucketModel.updateOne(
        { ownerUserId: userId, leg: VolumeLeg.LEFT },
        { $set: { availablePoints: 0 } },
      ),
      this.bucketModel.updateOne(
        { ownerUserId: userId, leg: VolumeLeg.RIGHT },
        { $set: { availablePoints: 0 } },
      ),
    ]);

    // ── Persist state + award ────────────────────────────────────────────
    const [, award] = await Promise.all([
      this.stateModel.create({
        userId,
        periodKey,
        cycle:          currentCycle,
        membershipTier: tier,
        capLimit:       dailyCap,
        capUsed:        capUsed + pairedPoints,
        leftAvailable,
        rightAvailable,
        pairedPoints,
        payoutPhp,
        leftCarryOut:  0, // always 0 — both sides flushed on every pairing
        rightCarryOut: 0,
      }),
      this.awardModel.create({
        userId,
        periodKey,
        cycle:           currentCycle,
        membershipTier:  tier,
        pairedPoints,
        payoutPhp,
        ratePhpPerPoint: this.RATE_PHP_PER_POINT,
        capLimit:        dailyCap,
        gcAwarded,
      }),
    ]);

    // ── Credit wallet ────────────────────────────────────────────────────
    if (gcAwarded > 0) {
      await this.walletService.credit({
        userId:   userIdStr,
        currency: WalletCurrency.GC_POINTS,
        amount:   gcAwarded,
        source:   WalletTxnSource.PAIRING,
        refKey:   `pairing:gc:${userIdStr}:${periodKey}`,
        note:     `GC reward — ${periodKey} | ${gcAwarded} GC (every 5th point)`,
        meta: {
          periodKey,
          seq,
          membershipTier: tier,
          pairedPoints,
          gcAwarded,
          capLimit:       dailyCap,
          capUsed:        capUsed + pairedPoints,
          leftAvailable,
          rightAvailable,
          leftFlushed,
          rightFlushed,
        },
      });
    }

    if (payoutPhp > 0) {
      await this.walletService.credit({
        userId:   userIdStr,
        currency: WalletCurrency.PHP,
        amount:   payoutPhp,
        source:   WalletTxnSource.PAIRING,
        refKey:   `pairing:${userIdStr}:${periodKey}`,
        note:
          `Pairing bonus — ${periodKey} | ` +
          `${phpPoints} pts × ₱${this.RATE_PHP_PER_POINT}` +
          (leftFlushed + rightFlushed > 0
            ? ` | flushed L=${leftFlushed} R=${rightFlushed} (safety net)`
            : ''),
        meta: {
          periodKey,
          seq,
          membershipTier:  tier,
          pairedPoints,
          phpPoints,
          capLimit:        dailyCap,
          capUsed:         capUsed + pairedPoints,
          ratePhpPerPoint: this.RATE_PHP_PER_POINT,
          leftAvailable,
          rightAvailable,
          leftFlushed,
          rightFlushed,
        },
      });
    }

    // ── Cascade 5% PHP topline bonus to all ancestors ────────────────────
    try {
      await this.cascadeToParent(userId, pairedPoints, payoutPhp, periodKey);
    } catch (err: any) {
      this.logger.error(`[tryPair] cascadeToParent failed: ${err.message}`);
    }

    this.logger.log(
      `[tryPair] ${userIdStr} ${periodKey} — ` +
      `${pairedPoints} pts paired → ₱${payoutPhp} | ` +
      `cap ${capUsed + pairedPoints}/${dailyCap} | ` +
      `flushed L=${leftFlushed} R=${rightFlushed}`,
    );

    return {
      skipped:           false,
      pairingsMade:      1,
      totalPairedPoints: pairedPoints,
      totalPayoutPhp:    payoutPhp,
      leftFlushed,
      rightFlushed,
      awards:            [this.formatAward(award.toObject())],
    };
  }

  // ── Topline bonus cascade ─────────────────────────────────────────────────

  /**
   * After a pairing for `userId`, walks up the full ancestor chain and awards
   * each upline a 5% PHP bonus from the child's payout.
   *
   * Volume points are NOT cascaded here — uplines receive package points only
   * when a new user is placed below them (handled in VolumeService).
   */
  private async cascadeToParent(
    userId: Types.ObjectId,
    pairedPoints: number,
    payoutPhp: number,
    periodKey: string,
  ): Promise<void> {
    const node = await this.genealogyNodeModel
      .findOne({ userId })
      .select('parentUserId position')
      .lean();

    if (!node?.parentUserId) return; // root — no parent to credit

    const parentId    = node.parentUserId as Types.ObjectId;
    const parentIdStr = parentId.toString();
    const leg         = (node as any).position === 'left' ? VolumeLeg.LEFT : VolumeLeg.RIGHT;

    // 5% PHP topline bonus — direct wallet credit, no GC passed up
    const bonusPhp = Math.floor(payoutPhp * 0.05);
    if (bonusPhp > 0) {
      await this.walletService.credit({
        userId:   parentIdStr,
        currency: WalletCurrency.PHP,
        amount:   bonusPhp,
        source:   WalletTxnSource.PAIRING,
        refKey:   `pairing:topline5pct:${parentIdStr}:from:${userId}:${periodKey}`,
        note:     `Pairing topline bonus (5%) — downline pairing ${periodKey}`,
        meta:     { pairedPoints, childPayoutPhp: payoutPhp, bonusPhp, leg, periodKey },
      });
    }

    // Continue up the chain to grandparent and above
    await this.cascadeToParent(parentId, pairedPoints, payoutPhp, periodKey);
  }

  // ── Manual / admin trigger ────────────────────────────────────────────────

  /**
   * Manually trigger pairing for a user (admin panel / testing).
   * Delegates to tryPairIfPossible — same rules apply.
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

    const totalPayoutPhp = awards.reduce((sum, a) => sum + (a.payoutPhp      ?? 0), 0);
    const totalPaired    = awards.reduce((sum, a) => sum + (a.pairedPoints   ?? 0), 0);

    return {
      dateKey,
      pairings: awards.map((award) => ({
        periodKey: award.periodKey,
        award:     this.formatAward(award),
        state:     this.formatState(
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
      const uid      = award.userId.toString();
      const user     = userMap.get(uid);
      const genealogy = depthMap.get(uid);
      return {
        award:          this.formatAward(award),
        username:       user?.username ?? uid,
        membershipTier: user?.membershipTier ?? award.membershipTier,
        depth:          genealogy?.depth    ?? 0,
        position:       genealogy?.position ?? null,
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

    const stateMap = new Map<string, any>(states.map((s) => [s.periodKey, s]));

    return awards.map((award) => {
      const state = stateMap.get(award.periodKey);
      return {
        award: this.formatAward(award),
        state: state ? this.formatState(state) : null,
      };
    });
  }

  // ── Cycle flush ───────────────────────────────────────────────────────────

  /**
   * Called by the scheduler at midnight and noon.
   * Resets ALL volume bucket availablePoints to 0 — end-of-cycle housekeeping.
   *
   * This is separate from the safety-net flush that happens during pairing.
   * The safety-net flush (both sides → 0) only fires when a pairing succeeds.
   * This scheduler flush catches any leftover points from users who never paired.
   */
  async flushAllAvailablePoints(): Promise<void> {
    await this.bucketModel.updateMany({}, { $set: { availablePoints: 0 } });
    this.logger.log('Cycle flush — all VolumeBucket.availablePoints reset to 0');
  }

  getCurrentPeriodKey(): string {
    const dateKey = new Date().toISOString().slice(0, 10);
    const cycle   = new Date().getHours() < 12 ? PairingCycle.AM : PairingCycle.PM;
    return `${dateKey}-${cycle}`;
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
      leftCarryOut:   s.leftCarryOut,   // always 0 — flushed on pairing
      rightCarryOut:  s.rightCarryOut,  // always 0 — flushed on pairing
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