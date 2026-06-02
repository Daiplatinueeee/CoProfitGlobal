/**
 * restore-flushed-points.ts
 *
 * Restores volume bucket availablePoints that were incorrectly wiped by the
 * scheduled AM/PM cycle flush (flushAllAvailablePoints). That flush was a bug —
 * it should have only reset the pairing cap, not the bucket points.
 *
 * The flush recorded a PAIRING_FLUSH wallet transaction per affected user with
 * meta.leftFlushed and meta.rightFlushed. This script reads those records and
 * adds the points back to VolumeBucket.availablePoints via $inc.
 *
 * Safe to run multiple times — uses raw MongoDB updateOne (bypasses Mongoose
 * strict mode) to mark each txn with `restoredAt` so re-runs skip them.
 *
 * Run from backend/:
 *   npx ts-node src/scripts/restore-flushed-points.ts
 */

import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../app.module';
import { WalletTxnSource } from '../modules/wallet/schemas/wallet-transaction.schema';
import { VolumeLeg } from '../modules/volume/schemas/volume-bucket.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const txnModel  = app.get(getModelToken('WalletTransaction')) as Model<any>;
    const buckModel = app.get(getModelToken('VolumeBucket'))       as Model<any>;

    // Find all PAIRING_FLUSH transactions not yet restored.
    // Use raw collection to avoid strict-mode issues with `restoredAt`.
    const flushTxns = await txnModel.collection
      .find({
        source:      WalletTxnSource.PAIRING_FLUSH,
        restoredAt:  { $exists: false },
      })
      .toArray();

    if (!flushTxns.length) {
      console.log('No unrestored PAIRING_FLUSH transactions found.');
      console.log('Either all points have already been restored, or no flush transactions were recorded.');
      return;
    }

    console.log(`Found ${flushTxns.length} flush transaction(s) to restore.\n`);

    let restored = 0;
    let skipped  = 0;

    for (const txn of flushTxns) {
      const userId    = txn.userId as Types.ObjectId;
      const userIdStr = userId.toString();
      const left      = txn.meta?.leftFlushed  ?? 0;
      const right     = txn.meta?.rightFlushed ?? 0;

      if (left <= 0 && right <= 0) {
        console.log(`  [SKIP] userId=${userIdStr} — meta has no points (L=${left} R=${right})`);
        // Still mark as restored so it doesn't show up on re-runs
        await txnModel.collection.updateOne(
          { _id: txn._id },
          { $set: { restoredAt: new Date(), restoredNote: 'zero-point flush — nothing to restore' } },
        );
        skipped++;
        continue;
      }

      // Restore left bucket
      if (left > 0) {
        await buckModel.collection.updateOne(
          { ownerUserId: userId, leg: VolumeLeg.LEFT },
          { $inc: { availablePoints: left } },
          { upsert: true },
        );
      }

      // Restore right bucket
      if (right > 0) {
        await buckModel.collection.updateOne(
          { ownerUserId: userId, leg: VolumeLeg.RIGHT },
          { $inc: { availablePoints: right } },
          { upsert: true },
        );
      }

      // Mark txn as restored (raw driver — bypasses Mongoose strict mode)
      await txnModel.collection.updateOne(
        { _id: txn._id },
        { $set: { restoredAt: new Date() } },
      );

      console.log(`  [OK]   userId=${userIdStr} — restored L=${left} R=${right}`);
      restored++;
    }

    console.log(`\nDone — restored: ${restored}, skipped (zero-point): ${skipped}`);
    console.log('Re-running this script is safe — restored transactions are skipped.');
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
