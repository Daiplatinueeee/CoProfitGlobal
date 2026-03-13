import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Activation, ActivationDocument } from '../activations/schemas/activation.schema';
import { PairingAward, PairingAwardDocument } from '../pairing/schemas/pairing-award.schema';

import {
  LeadershipQualification,
  LeadershipQualificationDocument,
} from './schemas/leadership-qualification.schema';
import {
  LeadershipAward,
  LeadershipAwardDocument,
} from './schemas/leadership-award.schema';

import { WalletService } from '../wallet/wallet.service';
import {
  WalletCurrency,
  WalletTxnSource,
} from '../wallet/schemas/wallet-transaction.schema';

@Injectable()
export class LeadershipService {
  private readonly THRESHOLD = 1500;
  private readonly RATE = 0.05;

  constructor(
    @InjectModel(Activation.name)
    private readonly activationModel: Model<ActivationDocument>,

    @InjectModel(PairingAward.name)
    private readonly pairingAwardModel: Model<PairingAwardDocument>,

    @InjectModel(LeadershipQualification.name)
    private readonly qualModel: Model<LeadershipQualificationDocument>,

    @InjectModel(LeadershipAward.name)
    private readonly awardModel: Model<LeadershipAwardDocument>,

    private readonly walletService: WalletService,
  ) {}

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ObjectId');
    }
    return new Types.ObjectId(id);
  }

  private currentMonthKey(): string {
    return new Date().toISOString().slice(0, 7); // YYYY-MM
  }

  private parseAsOf(asOfIso?: string): Date {
    if (!asOfIso) return new Date();
    const d = new Date(asOfIso);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid asOfDateIso');
    }
    return d;
  }

  private monthStart(monthKey: string): Date {
    const [yStr, mStr] = monthKey.split('-');
    const y = Number(yStr);
    const m = Number(mStr);

    if (!y || !m || m < 1 || m > 12) {
      throw new BadRequestException('Invalid monthKey');
    }

    return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  }

  private leadershipWindow(monthKey: string): { windowStart: Date; windowEnd: Date } {
    const [yStr, mStr] = monthKey.split('-');
    const y = Number(yStr);
    const m = Number(mStr);

    if (!y || !m || m < 1 || m > 12) {
      throw new BadRequestException('Invalid monthKey');
    }

    const windowStart = new Date(Date.UTC(y, m - 1, 15, 0, 0, 0, 0));
    const windowEnd = new Date(Date.UTC(y, m - 1, 30, 23, 59, 59, 999));

    return { windowStart, windowEnd };
  }

  private asOfDayKey(asOf: Date): string {
    return asOf.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  /**
   * Month-to-date unilevel points:
   * direct referral activations from first day of month up to asOf
   */
  private async computeUnilevelPoints(
    userId: Types.ObjectId,
    monthKey: string,
    asOf: Date,
  ): Promise<number> {
    const start = this.monthStart(monthKey);

    const rows = await this.activationModel
      .find({
        sponsorId: userId,
        activatedAt: {
          $gte: start,
          $lte: asOf,
        },
      })
      .select('points')
      .lean();

    return rows.reduce((sum, r: any) => sum + (r.points ?? 0), 0);
  }

  /**
   * Month-to-date pairing total:
   * PairingAward.periodKey is YYYY-MM-DD, so include
   * all awards from month start up to the asOf day.
   */
  private async computePairingTotalPhp(
    userId: Types.ObjectId,
    monthKey: string,
    asOf: Date,
  ): Promise<number> {
    const asOfDay = this.asOfDayKey(asOf);

    const rows = await this.pairingAwardModel
      .find({
        userId,
        periodKey: {
          $gte: `${monthKey}-01`,
          $lte: asOfDay,
        },
      })
      .select('payoutPhp periodKey')
      .lean();

    return rows.reduce((sum, r: any) => sum + (r.payoutPhp ?? 0), 0);
  }

  async evaluate(userIdStr: string, monthKey?: string, asOfDateIso?: string) {
    const userId = this.toObjectId(userIdStr);
    const mk = monthKey ?? this.currentMonthKey();
    const asOf = this.parseAsOf(asOfDateIso);

    const { windowStart, windowEnd } = this.leadershipWindow(mk);

    if (asOf < windowStart) {
      return {
        message: 'Not in leadership claim period yet',
        userId: userIdStr,
        monthKey: mk,
        windowStart,
        windowEnd,
        asOf,
      };
    }

    if (asOf > windowEnd) {
      return {
        message: 'Leadership claim period already ended for this month',
        userId: userIdStr,
        monthKey: mk,
        windowStart,
        windowEnd,
        asOf,
      };
    }

    const unilevelPoints = await this.computeUnilevelPoints(userId, mk, asOf);
    const qualified = unilevelPoints >= this.THRESHOLD;

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
        $setOnInsert: {
          userId,
          monthKey: mk,
        },
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
        asOf,
      };
    }

    const pairingTotalPhp = await this.computePairingTotalPhp(userId, mk, asOf);
    const targetLeadershipPhp =
      Math.round(pairingTotalPhp * this.RATE * 100) / 100;

    const existingAward = await this.awardModel.findOne({ userId, monthKey: mk }).lean();
    const previouslyAwardedPhp = existingAward?.leadershipPhp ?? 0;

    const deltaLeadershipPhp = Math.max(
      Math.round((targetLeadershipPhp - previouslyAwardedPhp) * 100) / 100,
      0,
    );

    await this.awardModel.updateOne(
      { userId, monthKey: mk },
      {
        $set: {
          pairingTotalPhp,
          rate: this.RATE,
          leadershipPhp: targetLeadershipPhp,
          awardedAt: asOf,
        },
        $setOnInsert: {
          userId,
          monthKey: mk,
        },
      },
      { upsert: true },
    );

    if (deltaLeadershipPhp > 0) {
      await this.walletService.credit({
        userId: userIdStr,
        currency: WalletCurrency.PHP,
        amount: deltaLeadershipPhp,
        source: WalletTxnSource.LEADERSHIP,
        refKey: `leadership:${userIdStr}:${mk}:to:${targetLeadershipPhp}`,
        note: `Leadership bonus update for ${mk}`,
        meta: {
          monthKey: mk,
          asOf,
          unilevelPoints,
          threshold: this.THRESHOLD,
          pairingTotalPhp,
          rate: this.RATE,
          previouslyAwardedPhp,
          targetLeadershipPhp,
          deltaLeadershipPhp,
        },
      });
    }

    return {
      message:
        deltaLeadershipPhp > 0
          ? 'Leadership bonus evaluated and credited'
          : 'Leadership bonus evaluated, no new delta to credit',
      userId: userIdStr,
      monthKey: mk,
      qualified: true,
      unilevelPoints,
      threshold: this.THRESHOLD,
      pairingTotalPhp,
      rate: this.RATE,
      previouslyAwardedPhp,
      targetLeadershipPhp,
      deltaLeadershipPhp,
      windowStart,
      windowEnd,
      asOf,
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