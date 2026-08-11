import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { GcRedemption, GcRedemptionDocument } from './schemas/gc-redemption.schema';
import { RedeemGcRewardDto } from './dto/redeem-gc-reward.dto';
import { WalletService } from '../wallet/wallet.service';
import { WalletCurrency, WalletTxnSource } from '../wallet/schemas/wallet-transaction.schema';

export interface GcRewardLevel {
  level: number;
  name: string;
  gcCost: number;
}

/**
 * The 8 Lifestyle Reward levels. GCs (gc_points wallet currency) convert into
 * these rewards. This is the source of truth for cost validation — the frontend
 * mirrors it only for display.
 */
export const GC_REWARD_LEVELS: GcRewardLevel[] = [
  { level: 1, name: 'Eat All You Can',    gcCost: 8 },
  { level: 2, name: 'Staycation for 2',   gcCost: 25 },
  { level: 3, name: 'Gadget / Cellphone', gcCost: 80 },
  { level: 4, name: 'Macbook',            gcCost: 250 },
  { level: 5, name: 'Motorcycle',         gcCost: 500 },
  { level: 6, name: 'Sedan Car',          gcCost: 5000 },
  { level: 7, name: 'SUV / Pick Up',      gcCost: 10000 },
  { level: 8, name: 'House and Lot',      gcCost: 25000 },
];

@Injectable()
export class GcRewardsService {
  constructor(
    @InjectModel(GcRedemption.name)
    private readonly redemptionModel: Model<GcRedemptionDocument>,
    private readonly walletService: WalletService,
  ) {}

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  private async gcBalance(userId: string): Promise<number> {
    const balances = await this.walletService.getBalances(userId);
    return balances?.balances?.[WalletCurrency.GC_POINTS] ?? 0;
  }

  getLevels(): GcRewardLevel[] {
    return GC_REWARD_LEVELS;
  }

  async getMyStatus(userId: string) {
    return {
      gcBalance: await this.gcBalance(userId),
      levels: GC_REWARD_LEVELS,
    };
  }

  async redeem(userId: string, dto: RedeemGcRewardDto) {
    const level = GC_REWARD_LEVELS.find(l => l.level === dto.level);
    if (!level) throw new NotFoundException('Reward level not found');

    const balance = await this.gcBalance(userId);
    if (balance < level.gcCost) {
      throw new BadRequestException(
        `Insufficient GC. You need ${level.gcCost} GC but have ${balance} GC available.`,
      );
    }

    const couponCode = this.generateCouponCode();

    // Debit GC first (idempotent via refKey). If it fails — e.g. a concurrent
    // redemption drained the balance — we never create the redemption record.
    await this.walletService.debit({
      userId,
      currency: WalletCurrency.GC_POINTS,
      amount: level.gcCost,
      source: WalletTxnSource.GC_REWARD_REDEMPTION,
      refKey: `gc-reward:${userId}:${couponCode}`,
      note: `Redeemed "${level.name}" (Level ${level.level}) for ${level.gcCost} GC`,
      meta: { level: level.level, rewardName: level.name },
    });

    const redemption = await this.redemptionModel.create({
      userId: this.toObjectId(userId),
      level: level.level,
      rewardName: level.name,
      gcCost: level.gcCost,
      couponCode,
      redeemedAt: new Date(),
    });

    return {
      message: `Successfully redeemed "${level.name}" for ${level.gcCost} GC.`,
      couponCode,
      level: level.level,
      rewardName: level.name,
      gcSpent: level.gcCost,
      remainingGc: await this.gcBalance(userId),
      redemption: this.format(redemption.toObject()),
    };
  }

  async getMyHistory(userId: string) {
    const rows = await this.redemptionModel
      .find({ userId: this.toObjectId(userId) })
      .sort({ redeemedAt: -1 })
      .lean();
    return rows.map(r => this.format(r));
  }

  async getAllRedemptions() {
    const rows = await this.redemptionModel.find().sort({ redeemedAt: -1 }).lean();
    return rows.map(r => this.format(r));
  }

  private format(doc: any) {
    return {
      _id:        doc._id?.toString?.() ?? doc._id,
      userId:     doc.userId?.toString?.(),
      level:      doc.level,
      rewardName: doc.rewardName,
      gcCost:     doc.gcCost,
      couponCode: doc.couponCode,
      redeemedAt: doc.redeemedAt,
    };
  }

  private generateCouponCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
