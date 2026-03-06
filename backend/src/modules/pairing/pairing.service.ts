import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { PairingState, PairingStateDocument } from './schemas/pairing-state.schema';
import { PairingAward, PairingAwardDocument } from './schemas/pairing-award.schema';

// we read volume buckets
import { VolumeBucket, VolumeBucketDocument } from '../volume/schemas/volume-bucket.schema';

@Injectable()
export class PairingService {
  private readonly RATE_PHP_PER_POINT = 400;
  private readonly CAP_LIMIT = 1200;

  constructor(
    @InjectModel(PairingState.name) private readonly stateModel: Model<PairingStateDocument>,
    @InjectModel(PairingAward.name) private readonly awardModel: Model<PairingAwardDocument>,
    @InjectModel(VolumeBucket.name) private readonly bucketModel: Model<VolumeBucketDocument>,
  ) {}

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  private todayPeriodKey(): string {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  /**
   * Gets the most recent pairing state BEFORE this period to obtain carry-out.
   * This is how we carry points across days.
   */
  private async getPreviousCarry(userId: Types.ObjectId, periodKey: string) {
    const prev = await this.stateModel
      .findOne({ userId, periodKey: { $lt: periodKey } })
      .sort({ periodKey: -1 })
      .lean();

    return {
      leftCarryIn: prev?.leftCarryOut ?? 0,
      rightCarryIn: prev?.rightCarryOut ?? 0,
    };
  }

  async runPairing(userIdStr: string, periodKey?: string) {
    const userId = this.toObjectId(userIdStr);
    const pk = periodKey ?? this.todayPeriodKey();

    // idempotency: if award already exists for this period, return it
    const existingAward = await this.awardModel.findOne({ userId, periodKey: pk }).lean();
    const existingState = await this.stateModel.findOne({ userId, periodKey: pk }).lean();

    if (existingAward && existingState) {
      return {
        message: 'Pairing already computed for this period',
        periodKey: pk,
        state: this.formatState(existingState),
        award: this.formatAward(existingAward),
      };
    }

    // Read volume points earned for this period
    const bucket = await this.bucketModel.findOne({ userId, periodKey: pk }).lean();

    const leftEarned = bucket?.leftPoints ?? 0;
    const rightEarned = bucket?.rightPoints ?? 0;

    // Carry-in from previous period
    const { leftCarryIn, rightCarryIn } = await this.getPreviousCarry(userId, pk);

    // Totals available to pair this period
    const leftTotal = leftCarryIn + leftEarned;
    const rightTotal = rightCarryIn + rightEarned;

    // Pairable points = min(left, right)
    const pairable = Math.min(leftTotal, rightTotal);

    // Cap enforcement (cap is per period here)
    const capRemaining = this.CAP_LIMIT; // since per period, used starts at 0
    const pairedPoints = Math.min(pairable, capRemaining);

    const payoutPhp = pairedPoints * this.RATE_PHP_PER_POINT;

    // Deduct paired points from both sides; leftover becomes carry-out
    const leftCarryOut = leftTotal - pairedPoints;
    const rightCarryOut = rightTotal - pairedPoints;

    // Persist state (one per period)
    const state = await this.stateModel.create({
      userId,
      periodKey: pk,

      leftEarned,
      rightEarned,

      leftCarryIn,
      rightCarryIn,

      leftTotal,
      rightTotal,

      pairedPoints,
      payoutPhp,

      leftCarryOut,
      rightCarryOut,

      capLimit: this.CAP_LIMIT,
      capUsed: pairedPoints,
    });

    // Persist award (one per period)
    const award = await this.awardModel.create({
      userId,
      periodKey: pk,
      pairedPoints,
      payoutPhp,
      ratePhpPerPoint: this.RATE_PHP_PER_POINT,
      capLimit: this.CAP_LIMIT,
    });

    return {
      message: 'Pairing computed',
      periodKey: pk,
      state: this.formatState(state.toObject()),
      award: this.formatAward(award.toObject()),
    };
  }

  async getState(userIdStr: string, periodKey: string) {
    const userId = this.toObjectId(userIdStr);

    const state = await this.stateModel.findOne({ userId, periodKey }).lean();
    const award = await this.awardModel.findOne({ userId, periodKey }).lean();

    return {
      periodKey,
      state: state ? this.formatState(state) : null,
      award: award ? this.formatAward(award) : null,
    };
  }

  private formatState(s: any) {
    return {
      id: s._id?.toString?.() ?? s._id,
      userId: s.userId.toString(),
      periodKey: s.periodKey,

      leftEarned: s.leftEarned,
      rightEarned: s.rightEarned,

      leftCarryIn: s.leftCarryIn,
      rightCarryIn: s.rightCarryIn,

      leftTotal: s.leftTotal,
      rightTotal: s.rightTotal,

      pairedPoints: s.pairedPoints,
      payoutPhp: s.payoutPhp,

      leftCarryOut: s.leftCarryOut,
      rightCarryOut: s.rightCarryOut,

      capLimit: s.capLimit,
      capUsed: s.capUsed,

      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private formatAward(a: any) {
    return {
      id: a._id?.toString?.() ?? a._id,
      userId: a.userId.toString(),
      periodKey: a.periodKey,
      pairedPoints: a.pairedPoints,
      payoutPhp: a.payoutPhp,
      ratePhpPerPoint: a.ratePhpPerPoint,
      capLimit: a.capLimit,
      createdAt: a.createdAt,
    };
  }
}