import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { MembershipTier, User, UserDocument } from '../users/schemas/user.schema';
import { PairingAward, PairingAwardDocument } from '../pairing/schemas/pairing-award.schema';
import { UnilevelProductsService } from '../unilevel-products/unilevel-products.service';
import {
  LeadershipQualification,
  LeadershipQualificationDocument,
} from './schemas/leadership-qualification.schema';
import {
  LeadershipAward,
  LeadershipAwardDocument,
} from './schemas/leadership-award.schema';
import {
  GenealogyNode,
  GenealogyNodeDocument,
} from '../genealogy/schema/genealogy-node.schema';

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
    @InjectModel(PairingAward.name)
    private readonly pairingAwardModel: Model<PairingAwardDocument>,

    private readonly unilevelProductsService: UnilevelProductsService,

    @InjectModel(GenealogyNode.name)
    private readonly genealogyNodeModel: Model<GenealogyNodeDocument>,

    @InjectModel(LeadershipQualification.name)
    private readonly qualModel: Model<LeadershipQualificationDocument>,

    @InjectModel(LeadershipAward.name)
    private readonly awardModel: Model<LeadershipAwardDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly walletService: WalletService,
  ) {}

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ObjectId');
    }
    return new Types.ObjectId(id);
  }

  private parseMonthKey(monthKey: string): { year: number; month: number } {
    const [yStr, mStr] = monthKey.split('-');
    const year = Number(yStr);
    const month = Number(mStr);

    if (!year || !month || month < 1 || month > 12) {
      throw new BadRequestException('Invalid monthKey');
    }

    return { year, month };
  }

  private currentMonthKey(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
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
    const { year, month } = this.parseMonthKey(monthKey);
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  }

  private monthEnd(monthKey: string): Date {
    const { year, month } = this.parseMonthKey(monthKey);
    // last day of the target month
    return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  }

  /**
   * Grace window:
   * 15th 00:00:00.000 up to last day of month 23:59:59.999
   */
  private leadershipWindow(monthKey: string): { windowStart: Date; windowEnd: Date } {
    const { year, month } = this.parseMonthKey(monthKey);

    const windowStart = new Date(Date.UTC(year, month - 1, 15, 0, 0, 0, 0));
    const windowEnd = this.monthEnd(monthKey);

    return { windowStart, windowEnd };
  }

  private asOfDayKey(asOf: Date): string {
    return asOf.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  /**
   * Month-to-date unilevel points from approved product purchases.
   * Users must buy individual products totalling 1500 PV to qualify for leadership bonus.
   * _asOf is kept in the signature for call-site compatibility but is not used —
   * all approved purchases in the month count regardless of evaluation time.
   */
  private async computeUnilevelPoints(
    userId: Types.ObjectId,
    monthKey: string,
    _asOf: Date,
  ): Promise<number> {
    return this.unilevelProductsService.computeMonthPv(userId, monthKey);
  }

  /**
   * Get all genealogy downlines of this user.
   * This assumes your GenealogyNode stores an `ancestors` array.
   */
  private async getDownlineUserIds(userId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const rows = await this.genealogyNodeModel
      .find({
        ancestors: userId,
      })
      .select('userId')
      .lean();

    return rows.map((r: any) => r.userId as Types.ObjectId);
  }

  /**
   * Leadership base:
   * total pairing payout of all downlines for the month up to asOf.
   */
  private async computeDownlinePairingTotalPhp(
    userId: Types.ObjectId,
    monthKey: string,
    asOf: Date,
  ): Promise<{
    downlineCount: number;
    totalPhp: number;
  }> {
    const downlineUserIds = await this.getDownlineUserIds(userId);

    if (!downlineUserIds.length) {
      return {
        downlineCount: 0,
        totalPhp: 0,
      };
    }

    const asOfDay = this.asOfDayKey(asOf);

    const rows = await this.pairingAwardModel
      .find({
        userId: { $in: downlineUserIds },
        periodKey: {
          $gte: `${monthKey}-01`,
          $lte: asOfDay,
        },
      })
      .select('payoutPhp userId periodKey')
      .lean();

    const totalPhp = rows.reduce((sum, r: any) => sum + (r.payoutPhp ?? 0), 0);

    return {
      downlineCount: downlineUserIds.length,
      totalPhp: this.round2(totalPhp),
    };
  }

  async evaluate(userIdStr: string, monthKey?: string, asOfDateIso?: string) {
    const userId = this.toObjectId(userIdStr);

    const user = await this.userModel.findById(userId).select('membershipTier').lean();
    if (!user || (user as any).membershipTier === MembershipTier.FREE) {
      return { skipped: true, reason: 'Free accounts are not eligible for leadership bonus' };
    }

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

    const { downlineCount, totalPhp: downlinePairingTotalPhp } =
      await this.computeDownlinePairingTotalPhp(userId, mk, asOf);

    const targetLeadershipPhp = this.round2(
      downlinePairingTotalPhp * this.RATE,
    );

    const existingAward = await this.awardModel.findOne({ userId, monthKey: mk }).lean();
    const previouslyAwardedPhp = existingAward?.leadershipPhp ?? 0;

    const deltaLeadershipPhp = Math.max(
      this.round2(targetLeadershipPhp - previouslyAwardedPhp),
      0,
    );

    await this.awardModel.updateOne(
      { userId, monthKey: mk },
      {
        $set: {
          // keep schema field name as pairingTotalPhp
          // but this now represents total downline pairing for the month
          pairingTotalPhp: downlinePairingTotalPhp,
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
          downlineCount,
          downlinePairingTotalPhp,
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
      downlineCount,
      downlinePairingTotalPhp,
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