import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { MembershipTier } from '../users/schemas/user.schema';
import { Activation, ActivationDocument } from '../activations/schemas/activation.schema';

import { Sign5Status, Sign5StatusDocument } from './schemas/sign5-status.schema';
import { Sign5Award, Sign5AwardDocument } from './schemas/sign5-award.schema';

import {
  WalletCurrency,
  WalletTxnSource,
} from '../wallet/schemas/wallet-transaction.schema';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class Sign5Service {
  private readonly MAX_CASH_SETS_PER_TIER_PER_MONTH = 5;

  constructor(
    @InjectModel(Activation.name)
    private readonly activationModel: Model<ActivationDocument>,

    @InjectModel(Sign5Status.name)
    private readonly statusModel: Model<Sign5StatusDocument>,

    @InjectModel(Sign5Award.name)
    private readonly awardModel: Model<Sign5AwardDocument>,

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

  private monthRange(monthKey: string): { start: Date; end: Date } {
    const [yStr, mStr] = monthKey.split('-');
    const y = Number(yStr);
    const m = Number(mStr);

    if (!y || !m || m < 1 || m > 12) {
      throw new BadRequestException('Invalid monthKey');
    }

    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

    return { start, end };
  }

  private tierCashValuePhp(tier: MembershipTier): number {
    switch (tier) {
      case MembershipTier.BRONZE:
        return 500;
      case MembershipTier.SILVER:
        return 1500;
      case MembershipTier.GOLD:
        return 2500;
      case MembershipTier.PLATINUM:
        return 3500;
      default:
        return 0;
    }
  }

  private gcPointsPerSet(tier: MembershipTier): number {
    return this.tierCashValuePhp(tier);
  }

  private async countDirectReferralActivations(
    sponsorId: Types.ObjectId,
    tier: MembershipTier,
    monthKey: string,
  ): Promise<number> {
    const { start, end } = this.monthRange(monthKey);

    return this.activationModel.countDocuments({
      sponsorId,
      tier,
      activatedAt: { $gte: start, $lt: end },
    });
  }

  private async evaluateTier(params: {
    userId: Types.ObjectId;
    userIdStr: string;
    monthKey: string;
    tier: MembershipTier;
    count: number;
    now: Date;
  }) {
    const { userId, userIdStr, monthKey, tier, count, now } = params;

    const setsOfFive = Math.floor(count / 5);

    const targetCashSetsPaid = Math.min(
      setsOfFive,
      this.MAX_CASH_SETS_PER_TIER_PER_MONTH,
    );

    const targetGcSetsPaid = Math.max(
      setsOfFive - this.MAX_CASH_SETS_PER_TIER_PER_MONTH,
      0,
    );

    const existing = await this.awardModel.findOne({
      userId,
      monthKey,
      tier,
    });

    const previouslyPaidCashSets = existing?.cashSetsPaid ?? 0;
    const previouslyPaidGcSets = existing?.gcSetsPaid ?? 0;

    const newCashSetsToPay = Math.max(
      targetCashSetsPaid - previouslyPaidCashSets,
      0,
    );

    const newGcSetsToPay = Math.max(
      targetGcSetsPaid - previouslyPaidGcSets,
      0,
    );

    const deltaCashAmountPhp = newCashSetsToPay * this.tierCashValuePhp(tier);
    const deltaGcPointsAmount = newGcSetsToPay * this.gcPointsPerSet(tier);

    if (deltaCashAmountPhp > 0) {
      await this.walletService.credit({
        userId: userIdStr,
        currency: WalletCurrency.PHP,
        amount: deltaCashAmountPhp,
        source: WalletTxnSource.SIGN5,
        refKey: `sign5:cash:${userIdStr}:${monthKey}:${tier}:${previouslyPaidCashSets + 1}-${targetCashSetsPaid}`,
        note: `Sign5 cash payout for ${tier} (${monthKey})`,
        meta: {
          monthKey,
          tier,
          newCashSetsToPay,
          targetCashSetsPaid,
          referralsCount: count,
        },
      });
    }

    if (deltaGcPointsAmount > 0) {
      await this.walletService.credit({
        userId: userIdStr,
        currency: WalletCurrency.GC_POINTS,
        amount: deltaGcPointsAmount,
        source: WalletTxnSource.SIGN5,
        refKey: `sign5:gc:${userIdStr}:${monthKey}:${tier}:${previouslyPaidGcSets + 1}-${targetGcSetsPaid}`,
        note: `Sign5 GC points for ${tier} (${monthKey})`,
        meta: {
          monthKey,
          tier,
          newGcSetsToPay,
          targetGcSetsPaid,
          referralsCount: count,
        },
      });
    }

    const nextCashAmountPhp =
      targetCashSetsPaid * this.tierCashValuePhp(tier);
    const nextGcPointsAmount =
      targetGcSetsPaid * this.gcPointsPerSet(tier);

    const updated = await this.awardModel.findOneAndUpdate(
      { userId, monthKey, tier },
      {
        $set: {
          referralsCount: count,
          setsOfFive,
          cashSetsPaid: targetCashSetsPaid,
          gcSetsPaid: targetGcSetsPaid,
          cashAmountPhp: nextCashAmountPhp,
          gcPointsAmount: nextGcPointsAmount,
          awardedAt: now,
        },
        $setOnInsert: {
          userId,
          monthKey,
          tier,
        },
      },
      {
        upsert: true,
        new: true,
      },
    ).lean();

    return {
      tier,
      referralsCount: count,
      setsOfFive,
      cashSetsPaid: targetCashSetsPaid,
      gcSetsPaid: targetGcSetsPaid,
      cashAmountPhp: nextCashAmountPhp,
      gcPointsAmount: nextGcPointsAmount,
      newCashSetsToPay,
      newGcSetsToPay,
      deltaCashAmountPhp,
      deltaGcPointsAmount,
      alreadyUpToDate: newCashSetsToPay === 0 && newGcSetsToPay === 0,
      award: updated,
    };
  }

  async evaluateForUser(userIdStr: string, monthKey?: string) {
    const userId = this.toObjectId(userIdStr);
    const mk = monthKey ?? this.currentMonthKey();
    const now = new Date();

    const [bronzeCount, silverCount, goldCount, platinumCount] =
      await Promise.all([
        this.countDirectReferralActivations(userId, MembershipTier.BRONZE, mk),
        this.countDirectReferralActivations(userId, MembershipTier.SILVER, mk),
        this.countDirectReferralActivations(userId, MembershipTier.GOLD, mk),
        this.countDirectReferralActivations(userId, MembershipTier.PLATINUM, mk),
      ]);

    await this.statusModel.updateOne(
      { userId, monthKey: mk },
      {
        $set: {
          bronzeCount,
          silverCount,
          goldCount,
          platinumCount,
          evaluatedAt: now,
        },
        $setOnInsert: {
          userId,
          monthKey: mk,
        },
      },
      { upsert: true },
    );

    const awards = await Promise.all([
      this.evaluateTier({
        userId,
        userIdStr,
        monthKey: mk,
        tier: MembershipTier.BRONZE,
        count: bronzeCount,
        now,
      }),
      this.evaluateTier({
        userId,
        userIdStr,
        monthKey: mk,
        tier: MembershipTier.SILVER,
        count: silverCount,
        now,
      }),
      this.evaluateTier({
        userId,
        userIdStr,
        monthKey: mk,
        tier: MembershipTier.GOLD,
        count: goldCount,
        now,
      }),
      this.evaluateTier({
        userId,
        userIdStr,
        monthKey: mk,
        tier: MembershipTier.PLATINUM,
        count: platinumCount,
        now,
      }),
    ]);

    return {
      message: 'Sign5 evaluated',
      userId: userIdStr,
      monthKey: mk,
      counts: {
        bronzeCount,
        silverCount,
        goldCount,
        platinumCount,
      },
      awards: awards.map((a) => ({
        tier: a.tier,
        referralsCount: a.referralsCount,
        setsOfFive: a.setsOfFive,
        cashSetsPaid: a.cashSetsPaid,
        gcSetsPaid: a.gcSetsPaid,
        cashAmountPhp: a.cashAmountPhp,
        gcPointsAmount: a.gcPointsAmount,
        newCashSetsToPay: a.newCashSetsToPay,
        newGcSetsToPay: a.newGcSetsToPay,
        deltaCashAmountPhp: a.deltaCashAmountPhp,
        deltaGcPointsAmount: a.deltaGcPointsAmount,
        alreadyUpToDate: a.alreadyUpToDate,
      })),
    };
  }

  async getStatus(userIdStr: string, monthKey: string) {
    const userId = this.toObjectId(userIdStr);

    const [status, awards] = await Promise.all([
      this.statusModel.findOne({ userId, monthKey }).lean(),
      this.awardModel.find({ userId, monthKey }).sort({ tier: 1 }).lean(),
    ]);

    return {
      userId: userIdStr,
      monthKey,
      status: status
        ? {
            bronzeCount: status.bronzeCount,
            silverCount: status.silverCount,
            goldCount: status.goldCount,
            platinumCount: status.platinumCount,
            evaluatedAt: status.evaluatedAt,
          }
        : null,
      awards: awards.map((a) => ({
        tier: a.tier,
        referralsCount: a.referralsCount,
        setsOfFive: a.setsOfFive,
        cashSetsPaid: a.cashSetsPaid,
        gcSetsPaid: a.gcSetsPaid,
        cashAmountPhp: a.cashAmountPhp,
        gcPointsAmount: a.gcPointsAmount,
        awardedAt: a.awardedAt,
      })),
    };
  }
}