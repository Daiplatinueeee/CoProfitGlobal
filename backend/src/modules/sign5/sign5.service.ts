import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { MembershipTier, User, UserDocument } from '../users/schemas/user.schema';

import {
  Sign5Status,
  Sign5StatusDocument,
} from './schemas/sign5-status.schema';
import {
  Sign5Award,
  Sign5AwardDocument,
} from './schemas/sign5-award.schema';

import {
  WalletCurrency,
  WalletTxnSource,
} from '../wallet/schemas/wallet-transaction.schema';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class Sign5Service {
  private readonly REQUIRED_DIRECTS_FOR_CASH = 5;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

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

  // cash reward value per tier
  private tierRewardValue(tier: MembershipTier): number {
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

  private async countDirectReferralActivations(
    sponsorId: Types.ObjectId,
    tier: MembershipTier,
    monthKey: string,
  ): Promise<number> {
    const { start, end } = this.monthRange(monthKey);

    // Query the User model — authoritative source for sponsorId + tier + join date.
    // Activation records may not exist for users placed via admin/genealogy directly,
    // so using User ensures sign5 counts every real referral regardless of how they joined.
    return this.userModel.countDocuments({
      sponsorId,
      membershipTier: tier,
      createdAt: { $gte: start, $lt: end },
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

    const rewardValue = this.tierRewardValue(tier);

    // Each complete set of 5 direct referrals = 1 cash payout.
    // No GC points — excess referrals just count toward the next set of 5.
    const targetTimesTriggered = Math.floor(count / this.REQUIRED_DIRECTS_FOR_CASH);

    const existing = await this.awardModel.findOne({ userId, monthKey, tier });
    const previousTimesTriggered = existing?.timesTriggered ?? 0;

    const newPayouts = Math.max(targetTimesTriggered - previousTimesTriggered, 0);

    // Issue one wallet credit per new payout so each has a unique refKey
    for (let i = 0; i < newPayouts; i++) {
      const payoutIndex = previousTimesTriggered + i + 1;
      await this.walletService.credit({
        userId: userIdStr,
        currency: WalletCurrency.PHP,
        amount: rewardValue,
        source: WalletTxnSource.SIGN5,
        refKey: `sign5:cash:${userIdStr}:${monthKey}:${tier}:${payoutIndex}`,
        note: `Sign5 cash payout #${payoutIndex} for ${tier} (${monthKey})`,
        meta: { monthKey, tier, referralsCount: count, payoutIndex },
      });
    }

    const totalCashAmountPhp = targetTimesTriggered * rewardValue;

    const updated = await this.awardModel.findOneAndUpdate(
      { userId, monthKey, tier },
      {
        $set: {
          referralsCount: count,
          timesTriggered: targetTimesTriggered,
          cashAmountPhp: totalCashAmountPhp,
          awardedAt: now,
        },
        $setOnInsert: { userId, monthKey, tier },
      },
      { upsert: true, returnDocument: 'after' },
    ).lean();

    return {
      tier,
      referralsCount: count,
      timesTriggered: targetTimesTriggered,
      cashAmountPhp: totalCashAmountPhp,
      newPayouts,
      alreadyUpToDate: newPayouts === 0,
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
        timesTriggered: a.timesTriggered,
        cashAmountPhp: a.cashAmountPhp,
        newPayouts: a.newPayouts,
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
        timesTriggered: a.timesTriggered,
        cashAmountPhp: a.cashAmountPhp,
        awardedAt: a.awardedAt,
      })),
    };
  }
} 