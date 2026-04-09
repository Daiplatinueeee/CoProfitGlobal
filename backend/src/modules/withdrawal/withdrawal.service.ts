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

    const { balances } = await this.walletService.getBalances(userId);
    const currency = (dto.currency as WalletCurrency) ?? WalletCurrency.PHP;

    let vat         = 0;
    let totalAmount = dto.amount;
    let paymentMethod = dto.paymentMethod ?? '';
    let accountName   = dto.accountName ?? '';

    if (currency === WalletCurrency.GC_POINTS) {
      const gcBalance = balances[WalletCurrency.GC_POINTS] ?? 0;
      if (gcBalance < dto.amount) {
        throw new BadRequestException(
          `Insufficient GC balance. Available: ${gcBalance.toLocaleString()} GC, required: ${dto.amount.toLocaleString()} GC`,
        );
      }
    } else {
      // PHP — apply VAT and validate payment details
      if (!paymentMethod) throw new BadRequestException('Payment method is required');
      if (!accountName)   throw new BadRequestException('Account name is required');

      const phpBalance = balances[WalletCurrency.PHP] ?? 0;
      vat         = Math.floor(dto.amount * VAT_RATE);
      totalAmount = dto.amount + vat;

      if (phpBalance < totalAmount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ₱${phpBalance.toLocaleString()}, required: ₱${totalAmount.toLocaleString()} (includes 10% VAT)`,
        );
      }
    }

    const request = await this.withdrawalModel.create({
      userId:        this.toObjectId(userId),
      currency,
      amount:        dto.amount,
      vat,
      totalAmount,
      paymentMethod,
      accountName,
      notes:         dto.notes ?? '',
      status:        WithdrawalStatus.PENDING,
    });

    return this.format(request.toObject());
  }

  /**
   * Returns withdrawal history for the requesting user.
   * Pass currency to filter by 'php' or 'gc_points'.
   */
  async getMyWithdrawals(userId: string, currency?: WalletCurrency) {
    const uid    = this.toObjectId(userId);
    const filter: Record<string, any> = { userId: uid };
    if (currency) filter.currency = currency;

    const rows = await this.withdrawalModel
      .find(filter)
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

    const currency = doc.currency ?? WalletCurrency.PHP;
    const note = currency === WalletCurrency.GC_POINTS
      ? `GC withdrawal — ${doc.amount.toLocaleString()} GC`
      : `Withdrawal payout — ${doc.paymentMethod} | ${doc.accountName}`;

    await this.walletService.debit({
      userId,
      currency,
      amount:   doc.totalAmount,
      source:   WalletTxnSource.WITHDRAWAL,
      refKey:   `withdrawal:${withdrawalId}`,
      note,
      meta:     { withdrawalId, currency, paymentMethod: doc.paymentMethod, accountName: doc.accountName },
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
   * Admin: get all withdrawal requests, optionally filtered by status and/or currency.
   */
  async getAllRequests(status?: WithdrawalStatus, currency?: WalletCurrency) {
    const filter: Record<string, any> = {};
    if (status)   filter.status   = status;
    if (currency) filter.currency = currency;

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
      currency:      doc.currency ?? WalletCurrency.PHP,
      amount:        doc.amount,
      vat:           doc.vat ?? 0,
      totalAmount:   doc.totalAmount ?? doc.amount,
      paymentMethod: doc.paymentMethod ?? '',
      accountName:   doc.accountName ?? '',
      notes:         doc.notes ?? '',
      status:        doc.status,
      adminNote:     doc.adminNote ?? '',
      processedAt:   doc.processedAt ?? null,
      createdAt:     doc.createdAt,
    };
  }
}
