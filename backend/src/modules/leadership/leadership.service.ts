import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Activation, ActivationDocument } from '../activations/schemas/activation.schema';
import { PairingAward, PairingAwardDocument } from '../pairing/schemas/pairing-award.schema';

import { LeadershipQualification, LeadershipQualificationDocument } from './schemas/leadership-qualification.schema';
import { LeadershipAward, LeadershipAwardDocument } from './schemas/leadership-award.schema';

import { WalletService } from '../wallet/wallet.service';
import { WalletCurrency, WalletTxnSource } from '../wallet/schemas/wallet-transaction.schema';

@Injectable()
export class LeadershipService {
  private readonly THRESHOLD = 1500;
  private readonly RATE = 0.05;

  constructor(
    @InjectModel(Activation.name) private readonly activationModel: Model<ActivationDocument>,
    @InjectModel(PairingAward.name) private readonly pairingAwardModel: Model<PairingAwardDocument>,
    @InjectModel(LeadershipQualification.name) private readonly qualModel: Model<LeadershipQualificationDocument>,
    @InjectModel(LeadershipAward.name) private readonly awardModel: Model<LeadershipAwardDocument>,
    private readonly walletService: WalletService,
  ) {}

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  private currentMonthKey(): string {
    return new Date().toISOString().slice(0, 7); // YYYY-MM
  }

  private monthRange(monthKey: string): { start: Date; end: Date } {
    const [yStr, mStr] = monthKey.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    if (!y || !m || m < 1 || m > 12) throw new BadRequestException('Invalid monthKey');

    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    return { start, end };
  }

  private leadershipWindow(monthKey: string): { windowStart: Date; windowEnd: Date } {
    // windowStart = 15th 00:00 UTC, windowEnd = 30th 23:59:59 UTC (15-day compliance)
    // Note: if month has 31 days, still a 15-day window ends on 30th.
    const [yStr, mStr] = monthKey.split('-');
    const y = Number(yStr);
    const m = Number(mStr);

    const windowStart = new Date(Date.UTC(y, m - 1, 15, 0, 0, 0, 0));
    const windowEnd = new Date(Date.UTC(y, m - 1, 30, 23, 59, 59, 999));
    return { windowStart, windowEnd };
  }

  private parseAsOf(asOfIso?: string): Date {
    if (!asOfIso) return new Date();
    const d = new Date(asOfIso);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid asOfDateIso');
    return d;
  }

  /**
   * Unilevel balance definition (ASSUMPTION):
   * Sum of Activation.points for DIRECT referrals within the month:
   * activation.sponsorId = userId
   * activatedAt within month range
   */
  private async computeUnilevelPoints(userId: Types.ObjectId, monthKey: string): Promise<number> {
    const { start, end } = this.monthRange(monthKey);

    const rows = await this.activationModel
      .find({
        sponsorId: userId,
        activatedAt: { $gte: start, $lt: end },
      })
      .select('points')
      .lean();

    return rows.reduce((sum, r: any) => sum + (r.points ?? 0), 0);
  }

  /**
   * Pairing total PHP within month:
   * PairingAward.periodKey is "YYYY-MM-DD" in your current pairing module.
   * We include all awards where periodKey starts with monthKey.
   */
  private async computePairingTotalPhp(userId: Types.ObjectId, monthKey: string): Promise<number> {
    const rows = await this.pairingAwardModel
      .find({
        userId,
        periodKey: { $regex: `^${monthKey}` },
      })
      .select('payoutPhp')
      .lean();

    return rows.reduce((sum, r: any) => sum + (r.payoutPhp ?? 0), 0);
  }

  async evaluate(userIdStr: string, monthKey?: string, asOfDateIso?: string) {
    const userId = this.toObjectId(userIdStr);
    const mk = monthKey ?? this.currentMonthKey();
    const asOf = this.parseAsOf(asOfDateIso);

    const { windowStart, windowEnd } = this.leadershipWindow(mk);

    // enforce evaluation window rule (15th to 30th)
    if (asOf < windowStart) {
      return {
        message: 'Not in leadership evaluation window yet',
        userId: userIdStr,
        monthKey: mk,
        windowStart,
        windowEnd,
        asOf,
      };
    }
    if (asOf > windowEnd) {
      return {
        message: 'Leadership compliance window already ended for this month',
        userId: userIdStr,
        monthKey: mk,
        windowStart,
        windowEnd,
        asOf,
      };
    }

    // 1) compute unilevel points & qualification
    const unilevelPoints = await this.computeUnilevelPoints(userId, mk);
    const qualified = unilevelPoints >= this.THRESHOLD;

    // 2) upsert qualification snapshot
    await this.qualModel.updateOne(
      { userId, monthKey: mk },
      {
        $set: {
          unilevelPoints,
          threshold: this.THRESHOLD,
          qualified,
          windowStart,
          windowEnd,
          evaluatedAt: asOf,
        },
        $setOnInsert: { userId, monthKey: mk },
      },
      { upsert: true },
    );

    if (!qualified) {
      return {
        message: 'Not qualified for leadership bonus',
        userId: userIdStr,
        monthKey: mk,
        unilevelPoints,
        threshold: this.THRESHOLD,
        qualified: false,
        windowStart,
        windowEnd,
      };
    }

    // 3) prevent duplicate award
    const existingAward = await this.awardModel.findOne({ userId, monthKey: mk }).lean();
    if (existingAward) {
      return {
        message: 'Leadership award already granted',
        userId: userIdStr,
        monthKey: mk,
        qualified: true,
        unilevelPoints,
        pairingTotalPhp: existingAward.pairingTotalPhp,
        leadershipPhp: existingAward.leadershipPhp,
      };
    }

    // 4) compute leadership payout based on pairing
    const pairingTotalPhp = await this.computePairingTotalPhp(userId, mk);
    const leadershipPhp = Math.round(pairingTotalPhp * this.RATE * 100) / 100; // 2 decimals

    // 5) store award
    await this.awardModel.create({
      userId,
      monthKey: mk,
      pairingTotalPhp,
      rate: this.RATE,
      leadershipPhp,
      awardedAt: asOf,
    });

    // 6) credit wallet (idempotent key)
    if (leadershipPhp > 0) {
      await this.walletService.credit({
        userId: userIdStr,
        currency: WalletCurrency.PHP,
        amount: leadershipPhp,
        source: WalletTxnSource.LEADERSHIP,
        refKey: `leadership:${userIdStr}:${mk}`,
        note: `Leadership bonus (5% of pairing) for ${mk}`,
        meta: { monthKey: mk, pairingTotalPhp, rate: this.RATE, unilevelPoints },
      });
    }

    return {
      message: 'Leadership bonus granted',
      userId: userIdStr,
      monthKey: mk,
      qualified: true,
      unilevelPoints,
      threshold: this.THRESHOLD,
      pairingTotalPhp,
      rate: this.RATE,
      leadershipPhp,
      windowStart,
      windowEnd,
    };
  }

  async getStatus(userIdStr: string, monthKey: string) {
    const userId = this.toObjectId(userIdStr);

    const qual = await this.qualModel.findOne({ userId, monthKey }).lean();
    const award = await this.awardModel.findOne({ userId, monthKey }).lean();

    return {
      userId: userIdStr,
      monthKey,
      qualification: qual
        ? {
            unilevelPoints: qual.unilevelPoints,
            threshold: qual.threshold,
            qualified: qual.qualified,
            windowStart: qual.windowStart,
            windowEnd: qual.windowEnd,
            evaluatedAt: qual.evaluatedAt,
          }
        : null,
      award: award
        ? {
            pairingTotalPhp: award.pairingTotalPhp,
            rate: award.rate,
            leadershipPhp: award.leadershipPhp,
            awardedAt: award.awardedAt,
          }
        : null,
    };
  }
}   