import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument, SystemRole } from '../users/schemas/user.schema';
import { Sign5Service } from './sign5.service';

@Injectable()
export class Sign5Scheduler {
  private readonly logger = new Logger(Sign5Scheduler.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly sign5Service: Sign5Service,
  ) {}

  /**
   * Runs at midnight on the 1st of every month.
   * Sweeps all users so each one gets a fresh Sign5Status + Sign5Award
   * document for the new monthKey, effectively resetting the monthly counters.
   * Without this sweep the counts would only reset when the next activation
   * fires for that user, which may never happen in quiet months.
   */
  @Cron('0 0 0 1 * *')
  async monthlyReset() {
    this.logger.log('Sign5 monthly reset — sweeping all users for new month');
    await this.sweepAll();
  }

  async sweepAll() {
    const users = await this.userModel
      .find({ role: SystemRole.USER })
      .select('_id')
      .lean();

    let evaluated = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await this.sign5Service.evaluateForUser(user._id.toString());
        evaluated++;
      } catch (err: any) {
        failed++;
        this.logger.error(
          `[sign5:sweep] Failed for ${user._id}: ${err.message}`,
        );
      }
    }

    this.logger.log(
      `Sign5 sweep done — evaluated: ${evaluated}, failed: ${failed}`,
    );
  }
}
