/**
 * diagnose-income-ratio.ts — READ-ONLY diagnostic.
 *
 * Investigates why a user's Today/This Week/This Month income figures look
 * too small compared to Total Income. Prints, per user matched by name/email
 * substring:
 *   - User.total* category fields and their sum (== totalIncome)
 *   - Raw PHP-credit wallet ledger sum grouped by source (== grandTotal)
 *   - The resulting ratio and which source(s) are NOT covered by a
 *     User.total* field (the likely culprits for any drift)
 *
 * Run from backend/:
 *   npx ts-node src/scripts/diagnose-income-ratio.ts "<name or email fragment>"
 */

import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { WalletCurrency, WalletTxnType } from '../modules/wallet/schemas/wallet-transaction.schema';

const CATEGORY_FIELDS = [
  'totalPairingBonus',
  'totalSign5Bonus',
  'totalLeadershipBonus',
  'totalDirectReferralIncome',
  'totalIndirectReferralIncome',
  'totalRepeatBinaryBonusIncome',
  'totalStairstepBonusIncome',
  'totalRoyaltyBonusIncome',
  'totalUnilevelLevelBonus',
];

const SOURCE_TO_FIELD: Record<string, string> = {
  pairing:              'totalPairingBonus',
  repeat_binary:        'totalRepeatBinaryBonusIncome',
  referral_direct:      'totalDirectReferralIncome',
  referral_indirect:    'totalIndirectReferralIncome',
  leadership:           'totalLeadershipBonus',
  sign5:                'totalSign5Bonus',
  spillover:            'totalStairstepBonusIncome',
  unilevel_level_bonus: 'totalUnilevelLevelBonus',
};

async function bootstrap() {
  const query = process.argv[2];
  if (!query) {
    console.error('Usage: npx ts-node src/scripts/diagnose-income-ratio.ts "<name or email fragment>"');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const userModel = app.get(getModelToken('User'))              as Model<any>;
    const txnModel  = app.get(getModelToken('WalletTransaction')) as Model<any>;

    const users = await userModel
      .find({
        $or: [
          { name:     { $regex: query, $options: 'i' } },
          { email:    { $regex: query, $options: 'i' } },
          { username: { $regex: query, $options: 'i' } },
        ],
      })
      .select(['_id', 'name', 'email', ...CATEGORY_FIELDS].join(' '))
      .lean();

    if (!users.length) {
      console.log(`No user matched "${query}".`);
      return;
    }

    for (const u of users) {
      console.log(`\n=== ${u.name} (${u.email}) — ${u._id.toString()} ===`);

      let totalIncome = 0;
      for (const f of CATEGORY_FIELDS) {
        const v = (u as any)[f] ?? 0;
        totalIncome += v;
        console.log(`  ${f.padEnd(30)} = ${v}`);
      }
      console.log(`  ${'totalIncome (sum above)'.padEnd(30)} = ${totalIncome}`);

      const bySource = await txnModel.aggregate([
        {
          $match: {
            userId:   u._id,
            currency: WalletCurrency.PHP,
            type:     WalletTxnType.CREDIT,
          },
        },
        { $group: { _id: '$source', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);

      let grandTotal = 0;
      console.log(`\n  Raw PHP-credit ledger by source:`);
      for (const row of bySource) {
        grandTotal += row.total;
        const mapped = SOURCE_TO_FIELD[row._id] ? '' : '  ⚠ NOT synced to a total* field';
        console.log(`    ${String(row._id).padEnd(24)} total=${row.total.toString().padEnd(12)} count=${row.count}${mapped}`);
      }
      console.log(`  ${'grandTotal (sum above)'.padEnd(30)} = ${grandTotal}`);

      const ratio = grandTotal > 0 ? totalIncome / grandTotal : 1;
      console.log(`\n  ratio = totalIncome / grandTotal = ${totalIncome} / ${grandTotal} = ${ratio}`);
    }
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
