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
  constructor(
    @InjectModel(Activation.name) private readonly activationModel: Model<ActivationDocument>,
    @InjectModel(Sign5Status.name) private readonly statusModel: Model<Sign5StatusDocument>,
    @InjectModel(Sign5Award.name) private readonly awardModel: Model<Sign5AwardDocument>,
    private readonly walletService: WalletService,
  ) {}

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  private currentMonthKey(): string {
    const d = new Date();
    return d.toISOString().slice(0, 7); // YYYY-MM
  }

  private monthRange(monthKey: string): { start: Date; end: Date } {
    // monthKey = "YYYY-MM"
    const [yStr, mStr] = monthKey.split('-');
    const y = Number(yStr);
    const m = Number(mStr);

    if (!y || !m || m < 1 || m > 12) throw new BadRequestException('Invalid monthKey');

    // start = first day of month UTC
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    // end = first day of next month UTC
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    return { start, end };
  }

  private tierCashValuePhp(tier: MembershipTier): number {
    // Your amounts:
    // bronze – 500, silver – 1500, gold – 2500, platinum – 3500
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

  /**
   * NOTE on GC points:
   * You said: after max 5, "can only received GC pts instead of points."
   * This implementation sets GC points amount = same numeric value as PHP amount for that set.
   * If you want a conversion (e.g., 1 PHP = 1 GC point), keep this.
   * If different, change gcPointsPerSet logic here.
   */
  private gcPointsPerSet(tier: MembershipTier): number {
    return this.tierCashValuePhp(tier);
  }

  private async countDirectReferralActivations(
    sponsorId: Types.ObjectId,
    tier: MembershipTier,
    monthKey: string,
  ): Promise<number> {
    const { start, end } = this.monthRange(monthKey);

    // Direct referrals = activations where sponsorId is the user
    const count = await this.activationModel.countDocuments({
      sponsorId,
      tier,
      activatedAt: { $gte: start, $lt: end },
    });

    return count;
  }

  async evaluateForUser(userIdStr: string, monthKey?: string) {
    const userId = this.toObjectId(userIdStr);
    const mk = monthKey ?? this.currentMonthKey();
    const now = new Date();

    // 1) Count direct referral activations for each tier
    const bronzeCount = await this.countDirectReferralActivations(userId, MembershipTier.BRONZE, mk);
    const silverCount = await this.countDirectReferralActivations(userId, MembershipTier.SILVER, mk);
    const goldCount = await this.countDirectReferralActivations(userId, MembershipTier.GOLD, mk);
    const platinumCount = await this.countDirectReferralActivations(userId, MembershipTier.PLATINUM, mk);

    // 2) Upsert monthly status snapshot
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
        $setOnInsert: { userId, monthKey: mk },
      },
      { upsert: true },
    );

    // 3) Compute awards per tier
    const tierResults = await Promise.all(
      [MembershipTier.BRONZE, MembershipTier.SILVER, MembershipTier.GOLD, MembershipTier.PLATINUM].map(async (tier) => {
        const count =
          tier === MembershipTier.BRONZE ? bronzeCount :
          tier === MembershipTier.SILVER ? silverCount :
          tier === MembershipTier.GOLD ? goldCount :
          platinumCount;

        const setsOfFive = Math.floor(count / 5);

        const cashSetsPaid = Math.min(setsOfFive, 5);
        const gcSetsPaid = Math.max(setsOfFive - 5, 0);

        const cashAmountPhp = cashSetsPaid * this.tierCashValuePhp(tier);
        const gcPointsAmount = gcSetsPaid * this.gcPointsPerSet(tier);

        // Idempotency: one award doc per tier/month/user. If exists, we won't re-post wallet.
        const existing = await this.awardModel.findOne({ userId, monthKey: mk, tier }).lean();
        if (existing) {
          return {
            tier,
            referralsCount: existing.referralsCount,
            setsOfFive: existing.setsOfFive,
            cashSetsPaid: existing.cashSetsPaid,
            gcSetsPaid: existing.gcSetsPaid,
            cashAmountPhp: existing.cashAmountPhp,
            gcPointsAmount: existing.gcPointsAmount,
            alreadyAwarded: true,
          };
        }

        // Save award record
        await this.awardModel.create({
          userId,
          monthKey: mk,
          tier,
          referralsCount: count,
          setsOfFive,
          cashSetsPaid,
          gcSetsPaid,
          cashAmountPhp,
          gcPointsAmount,
          awardedAt: now,
        });

        // 4) Post to wallet (cash PHP and GC points separately), idempotent via refKey
        // Cash (PHP)
        if (cashAmountPhp > 0) {
          await this.walletService.credit({
            userId: userIdStr,
            currency: WalletCurrency.PHP,
            amount: cashAmountPhp,
            source: WalletTxnSource.SIGN5,
            refKey: `sign5:cash:${userIdStr}:${mk}:${tier}`,
            note: `Sign5 cash payout for ${tier} (${mk})`,
            meta: { monthKey: mk, tier, cashSetsPaid, referralsCount: count },
          });
        }

        // GC points
        if (gcPointsAmount > 0) {
          await this.walletService.credit({
            userId: userIdStr,
            currency: WalletCurrency.GC_POINTS,
            amount: gcPointsAmount,
            source: WalletTxnSource.SIGN5,
            refKey: `sign5:gc:${userIdStr}:${mk}:${tier}`,
            note: `Sign5 GC points for ${tier} (${mk})`,
            meta: { monthKey: mk, tier, gcSetsPaid, referralsCount: count },
          });
        }

        return {
          tier,
          referralsCount: count,
          setsOfFive,
          cashSetsPaid,
          gcSetsPaid,
          cashAmountPhp,
          gcPointsAmount,
          alreadyAwarded: false,
        };
      }),
    );

    return {
      message: 'Sign5 evaluated',
      userId: userIdStr,
      monthKey: mk,
      counts: { bronzeCount, silverCount, goldCount, platinumCount },
      awards: tierResults,
    };
  }

  async getStatus(userIdStr: string, monthKey: string) {
    const userId = this.toObjectId(userIdStr);

    const status = await this.statusModel.findOne({ userId, monthKey }).lean();
    const awards = await this.awardModel.find({ userId, monthKey }).lean();

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