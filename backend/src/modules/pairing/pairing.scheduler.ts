import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument, SystemRole } from '../users/schemas/user.schema';
import { PairingService } from './pairing.service';
import { OnApplicationBootstrap } from '@nestjs/common'
@Injectable()
export class PairingScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(PairingScheduler.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly pairingService: PairingService,
  ) {}

  /**
   * Safety sweep — catches any users whose real-time trigger was missed
   * (e.g. volume credited during a service restart, race condition, etc.)
   *
   * Runs every 15 minutes. Each call to tryPairIfPossible is a no-op
   * when there's nothing to pair, so this is cheap for most users.
   */
  async onApplicationBootstrap() {
    this.logger.log('Boot sweep — checking all users for unpaired points...')
    await this.sweepAll()
  }

  // NOTE: Scheduled bucket flushes (amCycleFlush / pmCycleFlush) are intentionally
  // removed. Points persist in buckets until they are paired or the daily pairing cap
  // is exhausted mid-cycle (which clears both buckets via PAIRING_CAP_REACHED).
  // The daily cap itself resets automatically each AM/PM window via the periodKey prefix.

  @Cron('0 */15 * * * *') // every 15 minutes
  async sweepAll() {
    this.logger.debug('Pairing sweep — start');

    const users = await this.userModel
      .find({ role: SystemRole.USER })
      .select('_id')
      .lean();

    let paired  = 0;
    let skipped = 0;
    let failed  = 0;

    for (const user of users) {
      try {
        const result = await this.pairingService.tryPairIfPossible(
          user._id.toString(),
        );

        if (result.skipped) {
          skipped++;
        } else {
          paired++;
          this.logger.log(
            `[sweep] ${user._id} — ` +
            `${result.pairingsMade} pairing(s) | ` +
            `${result.totalPairedPoints} pts → ₱${result.totalPayoutPhp}`,
          );
        }
      } catch (err: any) {
        failed++;
        this.logger.error(`[sweep] Failed for ${user._id}: ${err.message}`);
      }

      try {
        const rbResult = await this.pairingService.tryRepeatBinaryIfPossible(
          user._id.toString(),
        );
        if (!rbResult.skipped) {
          this.logger.log(
            `[sweep:rb] ${user._id} — ` +
            `${rbResult.pairsCount} pairs → ₱${rbResult.totalPayoutPhp} | ` +
            `${rbResult.pvConsumed} PV consumed`,
          );
        }
      } catch (err: any) {
        this.logger.error(`[sweep:rb] Failed for ${user._id}: ${err.message}`);
      }
    }

    this.logger.debug(
      `Pairing sweep — done | active: ${paired}, idle: ${skipped}, failed: ${failed}`,
    );
  }
}