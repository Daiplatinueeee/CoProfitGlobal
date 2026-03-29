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

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private readonly txnModel: Model<WalletTransactionDocument>,
    @InjectModel(WalletBalance.name)
    private readonly balModel: Model<WalletBalanceDocument>,
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

    console.log(`[wallet:getBalances] userId=${userId} balances=${JSON.stringify(map)}`);

    return { userId, balances: map };
  }

  async getTransactions(userId: string, limit = 50) {
    const uid = this.toObjectId(userId);

    const rows = await this.txnModel
      .find({ userId: uid })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean();

    console.log(`[wallet:getTransactions] userId=${userId} count=${rows.length}`);

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

    return {
      message:    'Credited',
      userId:     params.userId,
      currency:   params.currency,
      newBalance: newBal,
    };
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