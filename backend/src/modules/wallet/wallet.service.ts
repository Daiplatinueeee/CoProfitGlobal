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
      [WalletCurrency.PHP]: 0,
      [WalletCurrency.POINTS]: 0,
      [WalletCurrency.GC_POINTS]: 0,
    };

    for (const r of rows) map[r.currency] = r.balance;

    return { userId, balances: map };
  }

  async getTransactions(userId: string, limit = 50) {
    const uid = this.toObjectId(userId);

    const rows = await this.txnModel
      .find({ userId: uid })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .lean();

    return rows.map((t) => ({
      id: t._id.toString(),
      userId: t.userId.toString(),
      currency: t.currency,
      type: t.type,
      amount: t.amount,
      source: t.source,
      refKey: t.refKey,
      note: t.note ?? '',
      meta: t.meta ?? {},
      postedAt: t.postedAt,
      createdAt: (t as any).createdAt,
    }));
  }

  private async upsertBalance(userId: Types.ObjectId, currency: WalletCurrency, delta: number) {
    // upsert and increment
    await this.balModel.updateOne(
      { userId, currency },
      {
        $inc: { balance: delta },
        $setOnInsert: { userId, currency, balance: 0 },
      },
      { upsert: true },
    );

    const row = await this.balModel.findOne({ userId, currency }).lean();
    return row?.balance ?? 0;
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

    if (params.amount <= 0) throw new BadRequestException('Amount must be > 0');

    // idempotency: if already exists, return current balance
    const exists = await this.txnModel.findOne({ refKey: params.refKey }).lean();
    if (exists) {
      const balances = await this.getBalances(params.userId);
      return { message: 'Already posted', ...balances };
    }

    await this.txnModel.create({
      userId: uid,
      currency: params.currency,
      type: WalletTxnType.CREDIT,
      amount: params.amount,
      source: params.source,
      refKey: params.refKey,
      note: params.note ?? '',
      meta: params.meta ?? {},
      postedAt: new Date(),
    });

    const newBal = await this.upsertBalance(uid, params.currency, +params.amount);

    return {
      message: 'Credited',
      userId: params.userId,
      currency: params.currency,
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

    if (params.amount <= 0) throw new BadRequestException('Amount must be > 0');

    const exists = await this.txnModel.findOne({ refKey: params.refKey }).lean();
    if (exists) {
      const balances = await this.getBalances(params.userId);
      return { message: 'Already posted', ...balances };
    }

    const currentRow = await this.balModel.findOne({ userId: uid, currency: params.currency }).lean();
    const currentBal = currentRow?.balance ?? 0;

    if (currentBal < params.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    await this.txnModel.create({
      userId: uid,
      currency: params.currency,
      type: WalletTxnType.DEBIT,
      amount: params.amount,
      source: params.source,
      refKey: params.refKey,
      note: params.note ?? '',
      meta: params.meta ?? {},
      postedAt: new Date(),
    });

    const newBal = await this.upsertBalance(uid, params.currency, -params.amount);

    return {
      message: 'Debited',
      userId: params.userId,
      currency: params.currency,
      newBalance: newBal,
    };
  }
}