/**
 * backfill-unilevel-level-bonus.ts
 *
 * One-time catch-up for a gap introduced when UNILEVEL_LEVEL_BONUS wallet
 * credits were added: WalletService.credit()'s SOURCE_TO_FIELD map didn't
 * include this source, so those credits landed in the wallet ledger but
 * never incremented User.totalUnilevelLevelBonus. That made
 * WalletService.getIncomeSummary()'s grandTotal (raw ledger sum) drift above
 * totalIncome (sum of User.total* fields), which silently shrinks the
 * Today/This Week/This Month figures via its proportional-scaling ratio.
 *
 * This script re-derives the correct total per user by summing their actual
 * UNILEVEL_LEVEL_BONUS wallet transactions and setting
 * User.totalUnilevelLevelBonus to that exact sum.
 *
 * Uses $set (not $inc) keyed off a fresh aggregate each run, so it is safe
 * to run more than once — re-running just re-confirms the same total.
 *
 * Run from backend/:
 *   npx ts-node src/scripts/backfill-unilevel-level-bonus.ts
 */

import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { WalletCurrency, WalletTxnSource, WalletTxnType } from '../modules/wallet/schemas/wallet-transaction.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const txnModel  = app.get(getModelToken('WalletTransaction')) as Model<any>;
    const userModel = app.get(getModelToken('User'))               as Model<any>;

    const totals = await txnModel.aggregate([
      {
        $match: {
          source:   WalletTxnSource.UNILEVEL_LEVEL_BONUS,
          currency: WalletCurrency.PHP,
          type:     WalletTxnType.CREDIT,
        },
      },
      { $group: { _id: '$userId', total: { $sum: '$amount' } } },
    ]);

    if (!totals.length) {
      console.log('No UNILEVEL_LEVEL_BONUS transactions found — nothing to backfill.');
      return;
    }

    console.log(`Found ${totals.length} user(s) with UNILEVEL_LEVEL_BONUS credits.\n`);

    let updated = 0;

    for (const row of totals) {
      const userId = row._id;
      const total  = row.total as number;

      const before = await userModel.findById(userId).select('totalUnilevelLevelBonus').lean();
      const beforeVal = before?.totalUnilevelLevelBonus ?? 0;

      if (beforeVal === total) {
        console.log(`  [SKIP] userId=${userId.toString()} — already ${total}`);
        continue;
      }

      await userModel.updateOne(
        { _id: userId },
        { $set: { totalUnilevelLevelBonus: total } },
      );

      console.log(`  [OK]   userId=${userId.toString()} — totalUnilevelLevelBonus ${beforeVal} → ${total}`);
      updated++;
    }

    console.log(`\nDone — updated: ${updated}, already correct: ${totals.length - updated}`);
    console.log('Re-running this script is safe.');
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
