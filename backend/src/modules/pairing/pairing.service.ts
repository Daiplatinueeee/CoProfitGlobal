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

export interface TryRepeatBinaryResult {
  skipped: boolean;
  reason?: string;
  scenario?: 'A' | 'B' | 'C';
  pairsCount?: number;
  totalPayoutPhp?: number;
  pvConsumed?: number;
}

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
  private async getDailyCapUsed(
    userId: Types.ObjectId,
    cyclePeriodPrefix: string,
    tierUpgradedAt: Date | null = null,
  ): Promise<number> {
    const match: Record<string, any> = {
      userId,
      periodKey: { $regex: `^${cyclePeriodPrefix}` },
    };
    // Only count awards earned after the last tier upgrade so a mid-cycle
    // upgrade resets the cap used to 0 for the new tier.
    if (tierUpgradedAt) {
      match.createdAt = { $gt: tierUpgradedAt };
    }
    const result = await this.awardModel.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$pairedPoints' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /**
   * Total regular (non-repeat-binary) paired points across all of the user's
   * historical pairing events. Used to determine which cumulative multiples of 5
   * are crossed in the current event → how many GC to award.
   *
   * Repeat-binary points are excluded because those events always pay full PHP
   * (gcAwarded=0); counting them would silently consume GC thresholds without
   * issuing GC rewards.
   */
  private async getLifetimePairedPoints(userId: Types.ObjectId): Promise<number> {
    const result = await this.awardModel.aggregate([
      { $match: { userId, isRepeatBinary: { $ne: true } } },
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
   * FLUSH RULES:
   *
   *   Cap NOT exhausted after pairing — remainder carries over:
   *     left=7, right=5, cap=10 → pairedPoints=5 → L→2  R→0  (cap 5/10, room left)
   *     left=3, right=5, cap=10 → pairedPoints=3 → L→0  R→2  (cap 3/10, room left)
   *
   *   Cap EXHAUSTED by this pairing — safety-net discard fires immediately:
   *     left=7, right=5, cap=3  → pairedPoints=3 → L→0  R→0  (cap 3/3, remainder flushed)
   *
   *   Cap already exhausted before pairing — full flush, no payout:
   *     left=7, right=1, cap=0  → cap exhausted  → L→0  R→0  (no payout)
   *
   *   One side empty — points held for next event:
   *     left=0, right=5, cap=3  → one side empty → R stays 5 (held for next cycle)
   */
  async tryPairIfPossible(userIdStr: string): Promise<TryPairResult> {
    const userId            = this.toObjectId(userIdStr);
    const dateKey           = this.todayDateKey();
    const currentCycle      = this.getCurrentCycle();
    const cyclePeriodPrefix = `${dateKey}-${currentCycle}`;

    // ── Resolve user ────────────────────────────────────────────────────
    const user = await this.userModel
      .findById(userId)
      .select('membershipTier tierUpgradedAt')
      .lean();

    if (!user) {
      return { skipped: true, reason: 'User not found' };
    }

    const tier            = (user as any).membershipTier as MembershipTier ?? MembershipTier.BRONZE;
    const tierUpgradedAt  = (user as any).tierUpgradedAt as Date | null ?? null;
    const dailyCap        = this.getCapForTier(tier);

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
      return {
        skipped: true,
        reason: 'Insufficient points on one or both sides — points held for next cycle',
      };
    }

    // ── Cap check — AFTER the empty-side guard ───────────────────────────
    // Both sides have points so a pairing event is occurring.
    // If the cap is exhausted, we still flush both buckets to 0 —
    // excess points above the safety net are discarded, no payout issued.
    const capUsed      = await this.getDailyCapUsed(userId, cyclePeriodPrefix, tierUpgradedAt);
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

      await this.walletService.recordFlush({
        userId:       userIdStr,
        leftFlushed:  leftAvailable,
        rightFlushed: rightAvailable,
        periodKey:    `${cyclePeriodPrefix}:cap:${Date.now()}`,
        note:         `Cap exhausted — all points flushed | L=${leftAvailable} R=${rightAvailable}`,
        meta:         { periodKey: cyclePeriodPrefix, dailyCap, capUsed, leftAvailable, rightAvailable },
      });

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

    // GC is earned at every 5th CUMULATIVE paired point across all events.
    // lifetimeBefore = total regular (non-repeat-binary) paired points before this event.
    const lifetimeBefore = await this.getLifetimePairedPoints(userId);
    const gcBefore  = Math.floor(lifetimeBefore / 5);
    const gcAfter   = Math.floor((lifetimeBefore + pairedPoints) / 5);
    const gcAwarded = gcAfter - gcBefore;
    const phpPoints = pairedPoints - gcAwarded;
    const payoutPhp = phpPoints * this.RATE_PHP_PER_POINT;

    // ── Determine post-pairing remainder vs safety-net flush ─────────────
    //
    // If this pairing exhausts the cap (capUsed + paired >= dailyCap),
    // the remainder is discarded immediately — no more pairings can fire
    // this cycle anyway, so carrying those points forward would be misleading.
    //
    // If the cap still has room, the remainder survives for the next event.
    const newCapUsed     = capUsed + pairedPoints;
    const capNowExhausted = newCapUsed >= dailyCap;

    const leftRemaining  = capNowExhausted ? 0 : leftAvailable  - pairedPoints;
    const rightRemaining = capNowExhausted ? 0 : rightAvailable - pairedPoints;

    // What was discarded beyond the paired amount (safety-net discard)
    const leftFlushed  = capNowExhausted ? leftAvailable  - pairedPoints : 0;
    const rightFlushed = capNowExhausted ? rightAvailable - pairedPoints : 0;

    const seq       = await this.getDailySequence(userId, cyclePeriodPrefix);
    const periodKey = `${cyclePeriodPrefix}-${seq}`;

    // ── Write remainder (or 0 if cap exhausted) back to both buckets ────
    await Promise.all([
      this.bucketModel.updateOne(
        { ownerUserId: userId, leg: VolumeLeg.LEFT },
        { $set: { availablePoints: leftRemaining } },
      ),
      this.bucketModel.updateOne(
        { ownerUserId: userId, leg: VolumeLeg.RIGHT },
        { $set: { availablePoints: rightRemaining } },
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
        capUsed:        newCapUsed,
        leftAvailable,
        rightAvailable,
        pairedPoints,
        payoutPhp,
        leftCarryOut:  leftRemaining,  // remainder carried into the next pairing event
        rightCarryOut: rightRemaining,
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
        note:     `GC reward — ${periodKey} | ${gcAwarded} GC (cumulative 5th-point milestone)`,
        meta: {
          periodKey,
          seq,
          membershipTier: tier,
          pairedPoints,
          gcAwarded,
          capLimit:       dailyCap,
          capUsed:        newCapUsed,
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
          `${phpPoints} pts × ₱${this.RATE_PHP_PER_POINT} | ` +
          `cap ${newCapUsed}/${dailyCap}` +
          (capNowExhausted && (leftFlushed + rightFlushed) > 0
            ? ` [EXHAUSTED] — flushed L=${leftFlushed} R=${rightFlushed}`
            : leftRemaining + rightRemaining > 0
              ? ` | carry L=${leftRemaining} R=${rightRemaining}`
              : ''),
        meta: {
          periodKey,
          seq,
          membershipTier:  tier,
          pairedPoints,
          phpPoints,
          capLimit:        dailyCap,
          capUsed:         newCapUsed,
          capNowExhausted,
          ratePhpPerPoint: this.RATE_PHP_PER_POINT,
          leftAvailable,
          rightAvailable,
          leftFlushed,
          rightFlushed,
        },
      });
    }

    if ((leftFlushed + rightFlushed) > 0) {
      await this.walletService.recordFlush({
        userId:       userIdStr,
        leftFlushed,
        rightFlushed,
        periodKey,
        note:         `Cap hit during pairing — excess flushed | L=${leftFlushed} R=${rightFlushed}`,
        meta:         { periodKey, dailyCap, capUsed: newCapUsed, pairedPoints, leftFlushed, rightFlushed },
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
      `cap ${newCapUsed}/${dailyCap}${capNowExhausted ? ' [EXHAUSTED]' : ''} | ` +
      `flushed L=${leftFlushed} R=${rightFlushed} | ` +
      `remaining L=${leftRemaining} R=${rightRemaining}`,
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
        source:   WalletTxnSource.LEADERSHIP,
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

  // ── Repeat Binary ────────────────────────────────────────────────────────

  /**
   * Fires after regular pairing when one or both legs have no points but the
   * user holds enough Unilevel PV to substitute:
   *   Scenario A: left ≥1 pt, right = 0, PV ≥ 80
   *   Scenario B: right ≥1 pt, left = 0, PV ≥ 80
   *   Scenario C: both = 0, PV ≥ 80
   * Shares the same per-cycle cap as regular pairing. 80 PV is consumed per pair.
   */
  async tryRepeatBinaryIfPossible(userIdStr: string): Promise<TryRepeatBinaryResult> {
    const userId            = this.toObjectId(userIdStr);
    const dateKey           = this.todayDateKey();
    const currentCycle      = this.getCurrentCycle();
    const cyclePeriodPrefix = `${dateKey}-${currentCycle}`;

    const user = await this.userModel.findById(userId).select('membershipTier tierUpgradedAt').lean();
    if (!user) return { skipped: true, reason: 'User not found' };

    const tier            = (user as any).membershipTier as MembershipTier ?? MembershipTier.BRONZE;
    const tierUpgradedAt  = (user as any).tierUpgradedAt as Date | null ?? null;
    const dailyCap        = this.getCapForTier(tier);
    const capUsed         = await this.getDailyCapUsed(userId, cyclePeriodPrefix, tierUpgradedAt);
    const capRemaining = dailyCap - capUsed;

    if (capRemaining <= 0) return { skipped: true, reason: 'Cap exhausted' };

    const [leftBucket, rightBucket] = await Promise.all([
      this.bucketModel.findOne({ ownerUserId: userId, leg: VolumeLeg.LEFT }).lean(),
      this.bucketModel.findOne({ ownerUserId: userId, leg: VolumeLeg.RIGHT }).lean(),
    ]);

    const leftPts  = leftBucket?.availablePoints  ?? 0;
    const rightPts = rightBucket?.availablePoints ?? 0;

    // Both sides have points → regular pairing handles this
    if (leftPts >= 1 && rightPts >= 1) {
      return { skipped: true, reason: 'Both legs have points — regular pairing applies' };
    }

    const pvResult = await this.walletService.getBalances(userIdStr);
    const userPV   = pvResult.balances[WalletCurrency.POINTS] ?? 0;

    if (userPV < 80) return { skipped: true, reason: 'Insufficient PV (need ≥ 80)' };

    let scenario: 'A' | 'B' | 'C';
    let pairsCount: number;

    if (leftPts >= 1 && rightPts === 0) {
      scenario   = 'A';
      pairsCount = Math.min(leftPts, Math.floor(userPV / 80), capRemaining);
    } else if (rightPts >= 1 && leftPts === 0) {
      scenario   = 'B';
      pairsCount = Math.min(rightPts, Math.floor(userPV / 80), capRemaining);
    } else {
      scenario   = 'C';
      pairsCount = Math.min(Math.floor(userPV / 80), capRemaining);
    }

    if (pairsCount <= 0) return { skipped: true, reason: 'pairsCount resolved to 0' };

    const pvToConsume = pairsCount * 80;
    const payoutPhp   = pairsCount * this.RATE_PHP_PER_POINT;

    // Deduct points from the leg that contributed them
    if (scenario === 'A') {
      await this.bucketModel.updateOne(
        { ownerUserId: userId, leg: VolumeLeg.LEFT },
        { $inc: { availablePoints: -pairsCount } },
      );
    } else if (scenario === 'B') {
      await this.bucketModel.updateOne(
        { ownerUserId: userId, leg: VolumeLeg.RIGHT },
        { $inc: { availablePoints: -pairsCount } },
      );
    }

    const seq       = await this.getDailySequence(userId, cyclePeriodPrefix);
    const periodKey = `${cyclePeriodPrefix}-${seq}`;

    try {
      // Debit PV — if insufficient at debit time (race), abort cleanly
      await this.walletService.debit({
        userId:   userIdStr,
        currency: WalletCurrency.POINTS,
        amount:   pvToConsume,
        source:   WalletTxnSource.REPEAT_BINARY_DEBIT,
        refKey:   `repeat_binary:pv:${userIdStr}:${periodKey}`,
        note:     `Repeat Binary PV deduction — ${periodKey} | ${pairsCount} pairs × 80 PV`,
        meta:     { scenario, periodKey, pairsCount, pvToConsume, capRemaining, capUsed },
      });

      await this.walletService.credit({
        userId:   userIdStr,
        currency: WalletCurrency.PHP,
        amount:   payoutPhp,
        source:   WalletTxnSource.REPEAT_BINARY,
        refKey:   `repeat_binary:${userIdStr}:${periodKey}`,
        note:     `Repeat Binary bonus — ${periodKey} | Scenario ${scenario} | ${pairsCount} pairs × ₱400 | ${pvToConsume} PV consumed`,
        meta:     { scenario, periodKey, pairsCount, pvToConsume, payoutPhp, capRemaining, capUsed },
      });

      await this.awardModel.create({
        userId,
        periodKey,
        cycle:           currentCycle,
        membershipTier:  tier,
        pairedPoints:    pairsCount,
        payoutPhp,
        ratePhpPerPoint: this.RATE_PHP_PER_POINT,
        capLimit:        dailyCap,
        gcAwarded:       0,
        isRepeatBinary:  true,
      });
    } catch (err: any) {
      this.logger.error(
        `[repeatBinary] ${userIdStr} ${periodKey} — failed after PV debit: ${err.message}. ` +
        `Manual check required: pvConsumed=${pvToConsume}, payoutPhp=${payoutPhp}`,
      );
      throw err;
    }

    this.logger.log(
      `[repeatBinary] ${userIdStr} ${periodKey} — ` +
      `Scenario ${scenario} | ${pairsCount} pairs → ₱${payoutPhp} | ` +
      `PV consumed: ${pvToConsume} | cap ${capUsed + pairsCount}/${dailyCap}`,
    );

    return { skipped: false, scenario, pairsCount, totalPayoutPhp: payoutPhp, pvConsumed: pvToConsume };
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
      leftCarryOut:   s.leftCarryOut,   // remainder carried into next pairing event
      rightCarryOut:  s.rightCarryOut,  // remainder carried into next pairing event
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

  // ── Current-cycle cap ─────────────────────────────────────────────────────

  async getCurrentCap(userIdStr: string) {
    const userId = this.toObjectId(userIdStr);
    const user = await this.userModel
      .findById(userId)
      .select('membershipTier tierUpgradedAt')
      .lean();
    if (!user) throw new BadRequestException('User not found');

    const now     = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const cycle   = this.getCurrentCycle();
    const cyclePeriodPrefix = `${dateKey}-${cycle}`;

    const tier     = (user as any).membershipTier as MembershipTier;
    const capLimit = this.TIER_CAP_MAP[tier] ?? this.TIER_CAP_MAP[MembershipTier.BRONZE];
    const tierUpgradedAt: Date | null = (user as any).tierUpgradedAt ?? null;

    const capUsed = await this.getDailyCapUsed(userId, cyclePeriodPrefix, tierUpgradedAt);

    return { cycle, capUsed, capLimit };
  }
}