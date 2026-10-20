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
import { UnilevelProductsService } from '../unilevel-products/unilevel-products.service';

import { PairingCycle } from './enums/pairing-cycle.enum';
export { PairingCycle };

export interface TryRepeatBinaryResult {
  skipped: boolean;
  reason?: string;
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
   * Repeat Binary: how much Available PV makes one bronze-equivalent point (one ₱400 pair).
   * Product PVs follow the company table (100ml perfume = 1 PV, 60ml = 0.50 PV,
   * 10ml = 0.10 PV, 5ml vial = 0.05 PV, RelieFleX = 0.25 PV, …), so 1 PV = 1 point.
   */
  private readonly PV_PER_REPEAT_BINARY_POINT = 1;

  /**
   * Maximum TOTAL pairs per day per membership tier (the "safety net").
   * Bronze = 3, Silver = 16, Gold = 30, Platinum = 50
   *
   * When a pairing fires, any points on either side that exceed this limit
   * are flushed to 0 — they do NOT carry over.
   */
  private readonly TIER_CAP_MAP: Record<MembershipTier, number> = {
    [MembershipTier.FREE]:     3,
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
    private readonly unilevelProductsService: UnilevelProductsService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  /** Tier → binary volume points (bronze=1, silver=3, gold=5, platinum=7). */
  private pointsForTier(tier: MembershipTier): number {
    switch (tier) {
      case MembershipTier.BRONZE:   return 1;
      case MembershipTier.SILVER:   return 3;
      case MembershipTier.GOLD:     return 5;
      case MembershipTier.PLATINUM: return 7;
      default:                      return 0; // FREE / unknown → no volume
    }
  }

  // AM/PM cycles and day boundaries are pinned to Taipei time regardless of
  // the server's own system timezone — previously `todayDateKey()` used UTC
  // (via toISOString) while `getCurrentCycle()` used the server's local
  // `getHours()`, so on a non-Taipei/non-UTC host the two could disagree
  // about where the day/cycle boundary actually falls.
  private readonly TIMEZONE = 'Asia/Taipei';

  private getTaipeiParts(date: Date = new Date()): { dateKey: string; hour: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const part of parts) map[part.type] = part.value;

    // Some environments format midnight as hour "24" instead of "00".
    let hour = parseInt(map.hour, 10);
    if (hour === 24) hour = 0;

    return { dateKey: `${map.year}-${map.month}-${map.day}`, hour };
  }

  private todayDateKey(): string {
    return this.getTaipeiParts().dateKey;
  }

  private getCurrentCycle(): PairingCycle {
    return this.getTaipeiParts().hour < 12 ? PairingCycle.AM : PairingCycle.PM;
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
      .select('membershipTier tierUpgradedAt isFree')
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
        source:       WalletTxnSource.PAIRING_CAP_REACHED,
        note:         `Pairing cap reached — points cleared | L=${leftAvailable} R=${rightAvailable}`,
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
        source:       WalletTxnSource.PAIRING_CAP_REACHED,
        note:         `Pairing cap reached — excess cleared | L=${leftFlushed} R=${rightFlushed}`,
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
   * After a pairing for `userId`, credits a 5% PHP bonus to `userId`'s direct
   * sponsor only (the user who recruited them via referral link — User.sponsorId).
   *
   * Binary tree ancestors who did NOT personally recruit the pairing user are
   * intentionally excluded — only the sponsor earns from their direct referral's
   * pairing. No recursive cascade up the ancestor chain.
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
    const user = await this.userModel
      .findById(userId)
      .select('sponsorId')
      .lean();

    const sponsorId = (user as any)?.sponsorId as Types.ObjectId | null | undefined;
    if (!sponsorId) return; // no sponsor — nothing to credit

    const sponsorIdStr = sponsorId.toString();

    // 5% PHP topline bonus to the direct sponsor only
    const bonusPhp = Math.floor(payoutPhp * 0.05);
    if (bonusPhp > 0) {
      await this.walletService.credit({
        userId:   sponsorIdStr,
        currency: WalletCurrency.PHP,
        amount:   bonusPhp,
        source:   WalletTxnSource.LEADERSHIP,
        refKey:   `pairing:topline5pct:${sponsorIdStr}:from:${userId}:${periodKey}`,
        note:     `Pairing topline bonus (5%) — direct referral pairing ${periodKey}`,
        meta:     { pairedPoints, childPayoutPhp: payoutPhp, bonusPhp, periodKey },
      });
    }

    // No recursion — only the immediate sponsor earns from their direct referral's pairing
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
   * Repeat Binary pairing — fires after regular pairing each sweep.
   *
   * Evaluated per-user. The user with ≥ 1 Available PV (Unilevel POINTS wallet)
   * is the one who benefits. It is a genuine binary pairing: the user's PV is
   * converted into bronze-equivalent points and paired against the tier volume
   * of the member on the OPPOSITE side of the same parent — the smaller side
   * decides how many pairs fire ("silver pairs bronze" → min(3, 1) = 1 pair).
   *
   *   1. Check the user's own Available PV ≥ PV_PER_REPEAT_BINARY_POINT (1 PV).
   *   2. Convert PV to points: 1 PV = 1 bronze point (₱400).
   *   3. Find the user's position in the genealogy (left or right child of parent).
   *   4. Find the sibling on the OPPOSITE side and read their tier points
   *      (bronze=1, silver=3, gold=5, platinum=7; FREE = 0).
   *   5. pairs = min(user PV points, opposite-side tier points).
   *      Each pair pays ₱400 and consumes 1 PV; unpaired PV is kept.
   *
   * Bypasses the regular binary daily cap — Unilevel PV is a separate income stream.
   * Shows on the user's own dashboard as "Total Income of Repeat Binary Bonus".
   */
  async tryRepeatBinaryIfPossible(userIdStr: string): Promise<TryRepeatBinaryResult> {
    const userId            = this.toObjectId(userIdStr);
    const dateKey           = this.todayDateKey();
    const currentCycle      = this.getCurrentCycle();
    const cyclePeriodPrefix = `${dateKey}-${currentCycle}`;

    const user = await this.userModel.findById(userId).select('membershipTier isFree').lean();
    if (!user) return { skipped: true, reason: 'User not found' };
    if ((user as any).isFree) return { skipped: true, reason: 'Free users excluded from repeat binary' };

    // 1. Check user's own Available PV (from unilevel purchases/pins minus redemptions/deductions)
    const userPV = await this.unilevelProductsService.computeAvailablePv(userId);

    if (userPV < this.PV_PER_REPEAT_BINARY_POINT) {
      return { skipped: true, reason: `Insufficient Available PV (need ≥ ${this.PV_PER_REPEAT_BINARY_POINT})` };
    }

    // 2. Convert PV to bronze-equivalent points — 1 PV = 1 point (₱400).
    //    Epsilon guards fractional PV sums (e.g. 10 × 0.10 = 0.9999…) from flooring short.
    const userPvPoints = Math.floor(userPV / this.PV_PER_REPEAT_BINARY_POINT + 1e-9);

    // 3. Find user's own genealogy node to know parent + position
    const ownNode = await this.genealogyNodeModel
      .findOne({ userId })
      .select('parentUserId position')
      .lean();

    if (!ownNode?.parentUserId) {
      return { skipped: true, reason: 'User is root — no parent, no sibling check possible' };
    }

    const parentId       = ownNode.parentUserId as Types.ObjectId;
    const ownPosition    = (ownNode as any).position as string; // 'left' | 'right'
    const siblingPos     = ownPosition === 'left' ? 'right' : 'left';

    // 4. Find the sibling on the opposite side of the same parent + read their tier
    const sibling = await this.genealogyNodeModel
      .findOne({ parentUserId: parentId, position: siblingPos })
      .select('userId')
      .lean();

    if (!sibling?.userId) {
      return { skipped: true, reason: `No member on the ${siblingPos} side of parent — no pair` };
    }

    const siblingUser = await this.userModel
      .findById(sibling.userId)
      .select('membershipTier isFree')
      .lean();

    const oppositePoints = (siblingUser && !(siblingUser as any).isFree)
      ? this.pointsForTier((siblingUser as any).membershipTier as MembershipTier)
      : 0;

    if (oppositePoints <= 0) {
      return { skipped: true, reason: `Opposite side (${siblingPos}) has no tier volume to pair against` };
    }

    // 5. Pair the smaller side — the 1-PV (bronze) side pairs against ANY
    //    opposite package (bronze/silver/gold/platinum) → min(userPvPoints,
    //    oppositePoints). Each pair pays ₱400 and DEDUCTS 1 PV. Only the paired
    //    PV is deducted — any unpaired PV is kept for a later pairing event.
    const pairsCount  = Math.min(userPvPoints, oppositePoints);

    if (pairsCount <= 0) {
      return { skipped: true, reason: 'No pairs — one side has zero points' };
    }

    const pvToConsume = pairsCount * this.PV_PER_REPEAT_BINARY_POINT;
    const payoutPhp   = pairsCount * this.RATE_PHP_PER_POINT;

    const tier      = (user as any).membershipTier as MembershipTier ?? MembershipTier.BRONZE;
    const seq       = await this.getDailySequence(userId, cyclePeriodPrefix);
    const periodKey = `${cyclePeriodPrefix}-rb-${seq}`;

    try {
      // Consume Available PV — creates a deduction record so computeAvailablePv reflects new balance
      await this.unilevelProductsService.consumePvForRepeatBinary(
        userId,
        pvToConsume,
        `repeat_binary:pv:${userIdStr}:${periodKey}`,
      );

      // Credit ₱400 per pair to this same user
      await this.walletService.credit({
        userId:   userIdStr,
        currency: WalletCurrency.PHP,
        amount:   payoutPhp,
        source:   WalletTxnSource.REPEAT_BINARY,
        refKey:   `repeat_binary:${userIdStr}:${periodKey}`,
        note:     `Repeat Binary bonus — ${periodKey} | ${pairsCount} pair(s) × ₱400 (min of ${userPvPoints} PV pts vs ${oppositePoints} ${siblingPos}-side pts) | ${pvToConsume} PV deducted (${userPV} → ${userPV - pvToConsume})`,
        meta:     { periodKey, pairsCount, pvToConsume, pvBefore: userPV, pvAfter: userPV - pvToConsume, payoutPhp, userPvPoints, oppositePoints, ownPosition, siblingPos },
      });

      await this.awardModel.create({
        userId,
        periodKey,
        cycle:           currentCycle,
        membershipTier:  tier,
        pairedPoints:    pairsCount,
        payoutPhp,
        ratePhpPerPoint: this.RATE_PHP_PER_POINT,
        capLimit:        0,
        gcAwarded:       0,
        isRepeatBinary:  true,
      });
    } catch (err: any) {
      this.logger.error(
        `[repeatBinary] ${userIdStr} ${periodKey} — failed: ${err.message}. ` +
        `Manual check required: pvConsumed=${pvToConsume}, payoutPhp=${payoutPhp}`,
      );
      throw err;
    }

    this.logger.log(
      `[repeatBinary] ${userIdStr} ${periodKey} — ` +
      `${pairsCount} pairs (min: ${userPvPoints} PV pts vs ${oppositePoints} ${siblingPos}-side pts) → ₱${payoutPhp} | ` +
      `PV consumed: ${pvToConsume} | position=${ownPosition}`,
    );

    return { skipped: false, pairsCount, totalPayoutPhp: payoutPhp, pvConsumed: pvToConsume };
  }

  // ── Cycle flush ───────────────────────────────────────────────────────────

  /**
   * Called by the scheduler at midnight and noon.
   * Resets ALL volume bucket availablePoints to 0 — end-of-cycle housekeeping.
   * Records a PAIRING_FLUSH ("Points Flushed") transaction for every user who
   * still had non-zero points so the cycle boundary is visible in their history.
   *
   * This is separate from PAIRING_CAP_REACHED which fires during the cycle when
   * the cap is hit. Those are already cleared to 0 by the time this runs.
   */
  async flushAllAvailablePoints(): Promise<void> {
    const { dateKey, hour } = this.getTaipeiParts();
    const cycle    = hour < 12 ? PairingCycle.AM : PairingCycle.PM;
    const cycleKey = `${dateKey}-${cycle}`;

    // Snapshot non-zero buckets BEFORE resetting
    const nonZero = await this.bucketModel
      .find({ availablePoints: { $gt: 0 } })
      .select('ownerUserId leg availablePoints')
      .lean();

    // Reset all buckets to 0
    await this.bucketModel.updateMany({}, { $set: { availablePoints: 0 } });
    this.logger.log(
      `Cycle flush — all VolumeBucket.availablePoints reset to 0 ` +
      `(${nonZero.length} non-zero buckets across users)`,
    );

    // Group left + right per user
    const userMap = new Map<string, { left: number; right: number }>();
    for (const b of nonZero) {
      const uid = (b as any).ownerUserId.toString();
      if (!userMap.has(uid)) userMap.set(uid, { left: 0, right: 0 });
      const entry = userMap.get(uid)!;
      if ((b as any).leg === VolumeLeg.LEFT) entry.left  = (b as any).availablePoints;
      else                                   entry.right = (b as any).availablePoints;
    }

    // Write one PAIRING_FLUSH record per user with leftover points
    for (const [userId, { left, right }] of userMap) {
      if (left + right <= 0) continue;
      try {
        await this.walletService.recordFlush({
          userId,
          leftFlushed:  left,
          rightFlushed: right,
          periodKey:    `cycle:${cycleKey}`,
          note:         `Points flushed — cycle reset | L=${left} R=${right}`,
          meta:         { cycleKey, leftFlushed: left, rightFlushed: right },
        });
      } catch (err: any) {
        this.logger.error(`[cycleFlush] recordFlush failed for ${userId}: ${err.message}`);
      }
    }
  }

  getCurrentPeriodKey(): string {
    const { dateKey, hour } = this.getTaipeiParts();
    const cycle = hour < 12 ? PairingCycle.AM : PairingCycle.PM;
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
      .select('membershipTier tierUpgradedAt isFree')
      .lean();
    if (!user) throw new BadRequestException('User not found');

    const dateKey = this.todayDateKey();
    const cycle   = this.getCurrentCycle();
    const cyclePeriodPrefix = `${dateKey}-${cycle}`;

    const tier     = (user as any).membershipTier as MembershipTier;
    const capLimit = this.getCapForTier(tier);
    const tierUpgradedAt: Date | null = (user as any).tierUpgradedAt ?? null;

    const capUsed = await this.getDailyCapUsed(userId, cyclePeriodPrefix, tierUpgradedAt);

    return { cycle, capUsed, capLimit };
  }
}