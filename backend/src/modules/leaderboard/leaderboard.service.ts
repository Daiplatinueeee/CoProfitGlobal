import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument, SystemRole } from '../users/schemas/user.schema';
import { WalletBalance, WalletBalanceDocument } from '../wallet/schemas/wallet-balance.schema';
import { Activation, ActivationDocument } from '../activations/schemas/activation.schema';
import { WalletCurrency } from '../wallet/schemas/wallet-transaction.schema';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(WalletBalance.name)
    private readonly walletBalanceModel: Model<WalletBalanceDocument>,

    @InjectModel(Activation.name)
    private readonly activationModel: Model<ActivationDocument>,
  ) {}

  async getLeaderboard(
    sortBy: 'earnings' | 'referrals' = 'earnings',
    limit = 50,
  ): Promise<{ totalParticipants: number; entries: LeaderboardEntryDto[] }> {
    const cappedLimit = Math.min(limit, 100);

    const totalParticipants = await this.userModel.countDocuments({ role: SystemRole.USER });

    const results = await this.userModel.aggregate([
      // Join PHP wallet balance
      {
        $lookup: {
          from: this.walletBalanceModel.collection.name,
          let: { uid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$uid'] },
                currency: WalletCurrency.PHP,
              },
            },
          ],
          as: 'walletDoc',
        },
      },
      // Join activations where this user is the sponsor (direct referrals)
      {
        $lookup: {
          from: this.activationModel.collection.name,
          let: { uid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$sponsorId', '$$uid'] },
              },
            },
            { $count: 'total' },
          ],
          as: 'referralCount',
        },
      },
      {
        $project: {
          name: 1,
          username: 1,
          avatar: '$profileImage',
          membershipTier: 1,
          earnings: {
            $ifNull: [{ $arrayElemAt: ['$walletDoc.balance', 0] }, 0],
          },
          referrals: {
            $ifNull: [{ $arrayElemAt: ['$referralCount.total', 0] }, 0],
          },
        },
      },
      {
        $sort: sortBy === 'referrals'
          ? { referrals: -1, earnings: -1 }
          : { earnings: -1, referrals: -1 },
      },
      { $limit: cappedLimit },
    ]);

    const entries = results.map((doc, index) => ({
      rank: index + 1,
      userId: doc._id.toString(),
      name: doc.name ?? '',
      username: doc.username ?? '',
      avatar: doc.avatar ?? null,
      membershipTier: doc.membershipTier ?? 'bronze',
      earnings: doc.earnings ?? 0,
      referrals: doc.referrals ?? 0,
    }));

    return { totalParticipants, entries };
  }
}
