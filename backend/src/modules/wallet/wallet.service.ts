import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  WalletTransaction,
  WalletTransactionDocument,
  WalletCurrency,
  WalletTxnType,
  WalletTxnSource,
} from './schemas/wallet-transaction.schema';
import { WalletBalance, WalletBalanceDocument } from './schemas/wallet-balance.schema';
import { User, UserDocument, MembershipTier } from '../users/schemas/user.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private readonly txnModel: Model<WalletTransactionDocument>,
    @InjectModel(WalletBalance.name)
    private readonly balModel: Model<WalletBalanceDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  async getBalances(userId: string) {
    const uid = this.toObjectId(userId);

    const rows = await this.balModel.find({ userId: uid }).lean();

    const map: Record<string, number> = {
      [WalletCurrency.PHP]:       0,
      [WalletCurrency.POINTS]:    0,
      [WalletCurrency.GC_POINTS]: 0,
    };

    for (const r of rows) map[r.currency] = r.balance;


    return { userId, balances: map };
  }

  async getIncomeSummary(userId: string) {
    const uid = this.toObjectId(userId);
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Per-bonus totals come from user model (admin-editable, absolute values).
    // Time-based sums (today/week/month) still aggregate wallet credits so
    // they reflect when income was actually posted.
    const [user, timeRows] = await Promise.all([
      this.userModel
        .findById(uid)
        .select(
          'totalPairingBonus totalSign5Bonus totalLeadershipBonus ' +
          'totalDirectReferralIncome totalIndirectReferralIncome ' +
          'totalRepeatBinaryBonusIncome totalStairstepBonusIncome ' +
          'totalRoyaltyBonusIncome',
        )
        .lean(),
      this.txnModel.aggregate([
        {
          $match: {
            userId: uid,
            currency: WalletCurrency.PHP,
            type: WalletTxnType.CREDIT,
          },
        },
        {
          $group: {
            _id: null,
            grandTotal: { $sum: '$amount' },
            today:      { $sum: { $cond: [{ $gte: ['$postedAt', startOfToday] }, '$amount', 0] } },
            thisWeek:   { $sum: { $cond: [{ $gte: ['$postedAt', startOfWeek] },  '$amount', 0] } },
            thisMonth:  { $sum: { $cond: [{ $gte: ['$postedAt', startOfMonth] }, '$amount', 0] } },
          },
        },
      ]),
    ]);

    const t = timeRows[0];
    const u = user as any;

    const pairingBonus          = u?.totalPairingBonus          ?? 0;
    const sign5Bonus            = u?.totalSign5Bonus            ?? 0;
    const leadershipBonus       = u?.totalLeadershipBonus       ?? 0;
    const directReferralBonus   = u?.totalDirectReferralIncome  ?? 0;
    const indirectReferralBonus = u?.totalIndirectReferralIncome ?? 0;
    const repeatBinaryBonus     = u?.totalRepeatBinaryBonusIncome ?? 0;
    const stairstepBonus        = u?.totalStairstepBonusIncome  ?? 0;
    const royaltyBonus          = u?.totalRoyaltyBonusIncome    ?? 0;

    const totalIncome =
      pairingBonus + sign5Bonus + leadershipBonus +
      directReferralBonus + indirectReferralBonus +
      repeatBinaryBonus + stairstepBonus + royaltyBonus;

    // Scale period sums proportionally when admin overrides bonus totals.
    // grandTotal = sum of all raw credit transactions; totalIncome = admin-edited truth.
    // Ratio < 1 when admin reduced income, > 1 when increased.
    const grandTotal = t?.grandTotal ?? 0;
    const ratio = grandTotal > 0 ? totalIncome / grandTotal : 1;

    return {
      userId,
      totalIncome,
      pairingBonus,
      repeatBinaryBonus,
      sign5Bonus,
      leadershipBonus,
      directReferralBonus,
      indirectReferralBonus,
      today:     (t?.today     ?? 0) * ratio,
      thisWeek:  (t?.thisWeek  ?? 0) * ratio,
      thisMonth: (t?.thisMonth ?? 0) * ratio,
    };
  }

  async getTransactions(userId: string, limit = 50) {
    const uid = this.toObjectId(userId);

    const rows = await this.txnModel
      .find({ userId: uid })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean();


    return rows.map((t) => ({
      id:        t._id.toString(),
      userId:    t.userId.toString(),
      currency:  t.currency,
      type:      t.type,
      amount:    t.amount,
      source:    t.source,
      refKey:    t.refKey,
      note:      t.note ?? '',
      meta:      t.meta ?? {},
      postedAt:  t.postedAt,
      createdAt: (t as any).createdAt,
    }));
  }

  private async upsertBalance(
    userId: Types.ObjectId,
    currency: WalletCurrency,
    delta: number,
  ) {
    console.log(`[wallet:upsertBalance] userId=${userId} currency=${currency} delta=${delta}`);

     await this.balModel.updateOne(
    { userId, currency },
    {
      $inc: { balance: delta },          // handles both new (0 + delta) and existing docs
      $setOnInsert: { userId, currency }, // only sets userId + currency on insert, NOT balance
    },
    { upsert: true },
  );

    const row = await this.balModel.findOne({ userId, currency }).lean();
    const newBalance = row?.balance ?? 0;

    console.log(`[wallet:upsertBalance] ✅ newBalance=${newBalance} currency=${currency}`);

    return newBalance;
  }

  async credit(params: {
    userId: string;
    currency: WalletCurrency;
    amount: number;
    source: WalletTxnSource;
    refKey: string;
    note?: string;
    meta?: Record<string, any>;
  }) {
    const uid = this.toObjectId(params.userId);

    console.log(
      `[wallet:credit] ▶ START — ` +
      `userId=${params.userId} ` +
      `amount=${params.amount} ` +
      `currency=${params.currency} ` +
      `source=${params.source} ` +
      `refKey=${params.refKey}`,
    );

    if (params.amount <= 0) {
      console.error(`[wallet:credit] ✖ Invalid amount=${params.amount} — must be > 0`);
      throw new BadRequestException('Amount must be > 0');
    }

    // ── FREE account bonus guard ────────────────────────────────────────
    // FREE accounts may never receive any performance bonus in PHP.
    // This is the last-resort wall — it fires even if a caller bypasses
    // the service-level checks in leadership/sign5/genealogy.
    const FREE_BLOCKED_SOURCES = new Set<WalletTxnSource>([
      WalletTxnSource.PAIRING,
      WalletTxnSource.REPEAT_BINARY,
      WalletTxnSource.SIGN5,
      WalletTxnSource.LEADERSHIP,
      WalletTxnSource.SPILLOVER,
      WalletTxnSource.REFERRAL_DIRECT,
      WalletTxnSource.REFERRAL_INDIRECT,
    ]);
    if (params.currency === WalletCurrency.PHP && FREE_BLOCKED_SOURCES.has(params.source)) {
      const recipientUser = await this.userModel
        .findById(uid)
        .select('isFree membershipTier')
        .lean();
      if (
        (recipientUser as any)?.isFree ||
        (recipientUser as any)?.membershipTier === MembershipTier.FREE
      ) {
        console.warn(
          `[wallet:credit] ⚠ Blocked bonus credit to FREE account — ` +
          `userId=${params.userId} source=${params.source} amount=${params.amount} refKey=${params.refKey}`,
        );
        const balances = await this.getBalances(params.userId);
        return { message: 'Blocked: FREE accounts cannot receive bonus credits', ...balances };
      }
    }

    // ── Idempotency check ───────────────────────────────────────────────
    const exists = await this.txnModel.findOne({ refKey: params.refKey }).lean();
    if (exists) {
      console.warn(`[wallet:credit] ⚠ Already posted — refKey=${params.refKey}`);
      const balances = await this.getBalances(params.userId);
      return { message: 'Already posted', ...balances };
    }

    // ── Write transaction ───────────────────────────────────────────────
    let txn: any;
    try {
      txn = await this.txnModel.create({
        userId:   uid,
        currency: params.currency,
        type:     WalletTxnType.CREDIT,
        amount:   params.amount,
        source:   params.source,
        refKey:   params.refKey,
        note:     params.note ?? '',
        meta:     params.meta ?? {},
        postedAt: new Date(),
      });
      console.log(`[wallet:credit] 📝 Transaction saved — txnId=${txn._id}`);
    } catch (err: any) {
      if (err?.code === 11000) {
        // Race condition: another concurrent call beat us to the insert — treat as already posted
        console.warn(`[wallet:credit] ⚠ Duplicate insert race — refKey=${params.refKey}`);
        const balances = await this.getBalances(params.userId);
        return { message: 'Already posted', ...balances };
      }
      console.error(`[wallet:credit] ✖ Failed to save transaction — ${err.message}`);
      throw err;
    }

    // ── Update balance ──────────────────────────────────────────────────
    let newBal: number;
    try {
      newBal = await this.upsertBalance(uid, params.currency, +params.amount);
    } catch (err: any) {
      console.error(`[wallet:credit] ✖ Failed to update balance — ${err.message}`);
      throw err;
    }

    console.log(
      `[wallet:credit] ✅ SUCCESS — ` +
      `userId=${params.userId} ` +
      `currency=${params.currency} ` +
      `credited=${params.amount} ` +
      `newBalance=${newBal}`,
    );

    // Keep total* bonus fields on User in sync so getIncomeSummary is accurate.
    if (params.currency === WalletCurrency.PHP) {
      const SOURCE_TO_FIELD: Partial<Record<WalletTxnSource, string>> = {
        [WalletTxnSource.PAIRING]:          'totalPairingBonus',
        [WalletTxnSource.REPEAT_BINARY]:    'totalRepeatBinaryBonusIncome',
        [WalletTxnSource.REFERRAL_DIRECT]:  'totalDirectReferralIncome',
        [WalletTxnSource.REFERRAL_INDIRECT]:'totalIndirectReferralIncome',
        [WalletTxnSource.LEADERSHIP]:       'totalLeadershipBonus',
        [WalletTxnSource.SIGN5]:            'totalSign5Bonus',
        [WalletTxnSource.SPILLOVER]:        'totalStairstepBonusIncome',
      };
      const field = SOURCE_TO_FIELD[params.source];
      if (field) {
        await this.userModel.updateOne(
          { _id: uid },
          { $inc: { [field]: params.amount } },
        );
      }
    }

    return {
      message:    'Credited',
      userId:     params.userId,
      currency:   params.currency,
      newBalance: newBal,
    };
  }

  async recordFlush(params: {
    userId: string;
    leftFlushed: number;
    rightFlushed: number;
    periodKey: string;
    note?: string;
    meta?: Record<string, any>;
  }) {
    const totalFlushed = params.leftFlushed + params.rightFlushed;
    if (totalFlushed <= 0) return;

    const uid    = this.toObjectId(params.userId);
    const refKey = `pairing:flush:${params.userId}:${params.periodKey}`;

    const exists = await this.txnModel.findOne({ refKey }).lean();
    if (exists) return;

    await this.txnModel.create({
      userId:   uid,
      currency: WalletCurrency.POINTS,
      type:     WalletTxnType.DEBIT,
      amount:   totalFlushed,
      source:   WalletTxnSource.PAIRING_FLUSH,
      refKey,
      note:     params.note ?? `Pairing flush — L=${params.leftFlushed} R=${params.rightFlushed}`,
      meta:     params.meta ?? {},
      postedAt: new Date(),
    });
  }

  async debit(params: {
    userId: string;
    currency: WalletCurrency;
    amount: number;
    source: WalletTxnSource;
    refKey: string;
    note?: string;
    meta?: Record<string, any>;
  }) {
    const uid = this.toObjectId(params.userId);

    console.log(
      `[wallet:debit] ▶ START — ` +
      `userId=${params.userId} ` +
      `amount=${params.amount} ` +
      `currency=${params.currency} ` +
      `source=${params.source} ` +
      `refKey=${params.refKey}`,
    );

    if (params.amount <= 0) {
      console.error(`[wallet:debit] ✖ Invalid amount=${params.amount} — must be > 0`);
      throw new BadRequestException('Amount must be > 0');
    }

    // ── Idempotency check ───────────────────────────────────────────────
    const exists = await this.txnModel.findOne({ refKey: params.refKey }).lean();
    if (exists) {
      console.warn(`[wallet:debit] ⚠ Already posted — refKey=${params.refKey}`);
      const balances = await this.getBalances(params.userId);
      return { message: 'Already posted', ...balances };
    }

    // ── Check sufficient balance ────────────────────────────────────────
    const currentRow = await this.balModel
      .findOne({ userId: uid, currency: params.currency })
      .lean();
    const currentBal = currentRow?.balance ?? 0;

    console.log(
      `[wallet:debit] 💰 Balance check — ` +
      `currentBalance=${currentBal} ` +
      `requested=${params.amount}`,
    );

    if (currentBal < params.amount) {
      console.error(
        `[wallet:debit] ✖ Insufficient balance — ` +
        `has=${currentBal} needs=${params.amount}`,
      );
      throw new BadRequestException('Insufficient balance');
    }

    // ── Write transaction ───────────────────────────────────────────────
    let txn: any;
    try {
      txn = await this.txnModel.create({
        userId:   uid,
        currency: params.currency,
        type:     WalletTxnType.DEBIT,
        amount:   params.amount,
        source:   params.source,
        refKey:   params.refKey,
        note:     params.note ?? '',
        meta:     params.meta ?? {},
        postedAt: new Date(),
      });
      console.log(`[wallet:debit] 📝 Transaction saved — txnId=${txn._id}`);
    } catch (err: any) {
      if (err?.code === 11000) {
        // Race condition: another concurrent call beat us to the insert — treat as already posted
        console.warn(`[wallet:debit] ⚠ Duplicate insert race — refKey=${params.refKey}`);
        const balances = await this.getBalances(params.userId);
        return { message: 'Already posted', ...balances };
      }
      console.error(`[wallet:debit] ✖ Failed to save transaction — ${err.message}`);
      throw err;
    }

    // ── Update balance ──────────────────────────────────────────────────
    let newBal: number;
    try {
      newBal = await this.upsertBalance(uid, params.currency, -params.amount);
    } catch (err: any) {
      console.error(`[wallet:debit] ✖ Failed to update balance — ${err.message}`);
      throw err;
    }

    console.log(
      `[wallet:debit] ✅ SUCCESS — ` +
      `userId=${params.userId} ` +
      `currency=${params.currency} ` +
      `debited=${params.amount} ` +
      `newBalance=${newBal}`,
    );

    return {
      message:    'Debited',
      userId:     params.userId,
      currency:   params.currency,
      newBalance: newBal,
    };
  }
}