import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
  WithdrawalStatus,
} from './schemas/withdrawal-request.schema';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WalletService } from '../wallet/wallet.service';
import { WalletCurrency, WalletTxnSource } from '../wallet/schemas/wallet-transaction.schema';

const VAT_RATE = 0.10;

@Injectable()
export class WithdrawalService {
  constructor(
    @InjectModel(WithdrawalRequest.name)
    private readonly withdrawalModel: Model<WithdrawalRequestDocument>,

    private readonly walletService: WalletService,
  ) {}

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ObjectId');
    return new Types.ObjectId(id);
  }

  /**
   * User submits a withdrawal request.
   * Balance is NOT debited yet — admin must approve first.
   */
  async submitRequest(userId: string, dto: CreateWithdrawalDto) {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be greater than 0');

    // Check available balance before creating the request
    const { balances } = await this.walletService.getBalances(userId);
    const phpBalance = balances[WalletCurrency.PHP] ?? 0;

    const vat         = Math.floor(dto.amount * VAT_RATE);
    const totalAmount = dto.amount + vat;

    if (phpBalance < totalAmount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ₱${phpBalance.toLocaleString()}, required: ₱${totalAmount.toLocaleString()} (includes 10% VAT)`,
      );
    }

    const request = await this.withdrawalModel.create({
      userId:        this.toObjectId(userId),
      amount:        dto.amount,
      vat,
      totalAmount,
      paymentMethod: dto.paymentMethod,
      accountName:   dto.accountName,
      notes:         dto.notes ?? '',
      status:        WithdrawalStatus.PENDING,
    });

    return this.format(request.toObject());
  }

  /**
   * Returns withdrawal history for the requesting user.
   */
  async getMyWithdrawals(userId: string) {
    const uid  = this.toObjectId(userId);
    const rows = await this.withdrawalModel
      .find({ userId: uid })
      .sort({ createdAt: -1 })
      .lean();
    return rows.map(this.format);
  }

  /**
   * Admin: approve a pending request.
   * Debits wallet and marks as completed.
   */
  async approve(withdrawalId: string, adminNote = '') {
    const doc = await this.withdrawalModel.findById(withdrawalId);
    if (!doc) throw new NotFoundException('Withdrawal request not found');
    if (doc.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Request is already ${doc.status}`);
    }

    const userId = doc.userId.toString();

    await this.walletService.debit({
      userId,
      currency: WalletCurrency.PHP,
      amount:   doc.totalAmount,
      source:   WalletTxnSource.WITHDRAWAL,
      refKey:   `withdrawal:${withdrawalId}`,
      note:     `Withdrawal payout — ${doc.paymentMethod} | ${doc.accountName}`,
      meta:     { withdrawalId, paymentMethod: doc.paymentMethod, accountName: doc.accountName },
    });

    doc.status      = WithdrawalStatus.COMPLETED;
    doc.adminNote   = adminNote;
    doc.processedAt = new Date();
    await doc.save();

    return this.format(doc.toObject());
  }

  /**
   * Admin: reject a pending request. No wallet debit.
   */
  async reject(withdrawalId: string, adminNote = '') {
    const doc = await this.withdrawalModel.findById(withdrawalId);
    if (!doc) throw new NotFoundException('Withdrawal request not found');
    if (doc.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Request is already ${doc.status}`);
    }

    doc.status      = WithdrawalStatus.REJECTED;
    doc.adminNote   = adminNote;
    doc.processedAt = new Date();
    await doc.save();

    return this.format(doc.toObject());
  }

  /**
   * Admin: get all withdrawal requests (optionally filter by status).
   */
  async getAllRequests(status?: WithdrawalStatus) {
    const filter = status ? { status } : {};
    const rows = await this.withdrawalModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return rows.map(this.format);
  }

  private format(doc: any) {
    return {
      id:            doc._id?.toString?.() ?? doc._id,
      userId:        doc.userId?.toString(),
      amount:        doc.amount,
      vat:           doc.vat,
      totalAmount:   doc.totalAmount,
      paymentMethod: doc.paymentMethod,
      accountName:   doc.accountName,
      notes:         doc.notes ?? '',
      status:        doc.status,
      adminNote:     doc.adminNote ?? '',
      processedAt:   doc.processedAt ?? null,
      createdAt:     doc.createdAt,
    };
  }
}
