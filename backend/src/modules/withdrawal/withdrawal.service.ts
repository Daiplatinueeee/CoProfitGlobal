import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
   * Computes vat/totalAmount and validates the dto for a given currency.
   * `availableBalance` is the spendable balance the request must fit inside.
   */
  private computeAndValidate(
    dto: CreateWithdrawalDto,
    currency: WalletCurrency,
    availableBalance: number,
  ): { vat: number; totalAmount: number; paymentMethod: string; accountName: string } {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be greater than 0');
    if (currency !== WalletCurrency.GC_POINTS && dto.amount < 100) {
      throw new BadRequestException('Minimum payout request is ₱100');
    }

    let vat           = 0;
    let totalAmount   = dto.amount;
    const paymentMethod = dto.paymentMethod ?? '';
    const accountName   = dto.accountName ?? '';

    if (currency === WalletCurrency.GC_POINTS) {
      if (availableBalance < dto.amount) {
        throw new BadRequestException(
          `Insufficient GC balance. Available: ${availableBalance.toLocaleString()} GC, required: ${dto.amount.toLocaleString()} GC`,
        );
      }
    } else {
      // PHP — apply VAT and validate payment details
      if (!paymentMethod) throw new BadRequestException('Payment method is required');
      if (paymentMethod !== 'cash' && !accountName) throw new BadRequestException('Account name is required');

      const adminFee = 50;
      vat         = Math.floor(dto.amount * VAT_RATE);
      totalAmount = dto.amount - vat - adminFee;

      if (availableBalance < dto.amount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ₱${availableBalance.toLocaleString()}, required: ₱${dto.amount.toLocaleString()}`,
        );
      }
    }

    return { vat, totalAmount, paymentMethod, accountName };
  }

  /**
   * User submits a withdrawal request.
   * The requested amount is debited from the wallet IMMEDIATELY (not on approval).
   * Only one pending request per currency is allowed — the user must update the
   * existing one instead of creating a second.
   */
  async submitRequest(userId: string, dto: CreateWithdrawalDto) {
    const currency = (dto.currency as WalletCurrency) ?? WalletCurrency.PHP;
    const uid = this.toObjectId(userId);

    // ── Single active request guard ──────────────────────────────────────
    const existing = await this.withdrawalModel.findOne({
      userId:   uid,
      currency,
      status:   WithdrawalStatus.PENDING,
    }).lean();
    if (existing) {
      throw new BadRequestException(
        'You can only submit one payout request at a time. Please update your existing pending request instead.',
      );
    }

    const { balances } = await this.walletService.getBalances(userId);
    const available = balances[currency] ?? 0;

    const { vat, totalAmount, paymentMethod, accountName } =
      this.computeAndValidate(dto, currency, available);

    const request = await this.withdrawalModel.create({
      userId:        uid,
      currency,
      amount:        dto.amount,
      vat,
      totalAmount,
      paymentMethod,
      accountName,
      contactNumber: dto.contactNumber ?? '',
      notes:         dto.notes ?? '',
      status:        WithdrawalStatus.PENDING,
    });

    // Debit immediately so the balance reflects the locked funds.
    await this.walletService.debit({
      userId,
      currency,
      amount: dto.amount,
      source: WalletTxnSource.WITHDRAWAL,
      refKey: `withdrawal:${request._id}`,
      note:   currency === WalletCurrency.GC_POINTS
        ? `GC withdrawal request — ${dto.amount.toLocaleString()} GC`
        : `Withdrawal request — ${paymentMethod} | ${accountName}`,
      meta:   { withdrawalId: request._id.toString(), currency, paymentMethod, accountName },
    });

    return this.format(request.toObject());
  }

  /**
   * User updates their existing PENDING request.
   * Refunds the previously-locked amount and re-debits the new amount.
   */
  async updateRequest(userId: string, withdrawalId: string, dto: CreateWithdrawalDto) {
    const doc = await this.withdrawalModel.findById(withdrawalId);
    if (!doc) throw new NotFoundException('Withdrawal request not found');
    if (doc.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own request');
    }
    if (doc.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Request is already ${doc.status} and can no longer be edited`);
    }

    const currency = doc.currency ?? WalletCurrency.PHP;

    // Effective available = current balance + the amount already locked by this request.
    const { balances } = await this.walletService.getBalances(userId);
    const available = (balances[currency] ?? 0) + doc.amount;

    const { vat, totalAmount, paymentMethod, accountName } =
      this.computeAndValidate(dto, currency, available);

    const ts = Date.now();

    // Refund the old locked amount, then debit the new amount.
    await this.walletService.credit({
      userId,
      currency,
      amount: doc.amount,
      source: WalletTxnSource.WITHDRAWAL,
      refKey: `withdrawal-refund:${withdrawalId}:${ts}`,
      note:   'Payout request updated — previous amount refunded',
      meta:   { withdrawalId, currency, reason: 'update-refund' },
    });

    await this.walletService.debit({
      userId,
      currency,
      amount: dto.amount,
      source: WalletTxnSource.WITHDRAWAL,
      refKey: `withdrawal:${withdrawalId}:${ts}`,
      note:   currency === WalletCurrency.GC_POINTS
        ? `GC withdrawal request (updated) — ${dto.amount.toLocaleString()} GC`
        : `Withdrawal request (updated) — ${paymentMethod} | ${accountName}`,
      meta:   { withdrawalId, currency, paymentMethod, accountName, reason: 'update-debit' },
    });

    doc.amount        = dto.amount;
    doc.vat           = vat;
    doc.totalAmount   = totalAmount;
    doc.paymentMethod = paymentMethod;
    doc.accountName   = accountName;
    doc.contactNumber = dto.contactNumber ?? '';
    await doc.save();

    return this.format(doc.toObject());
  }

  /**
   * User cancels their own PENDING request.
   * Refunds the locked amount back to the wallet.
   */
  async cancelRequest(userId: string, withdrawalId: string) {
    const doc = await this.withdrawalModel.findById(withdrawalId);
    if (!doc) throw new NotFoundException('Withdrawal request not found');
    if (doc.userId.toString() !== userId) {
      throw new ForbiddenException('You can only cancel your own request');
    }
    if (doc.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Request is already ${doc.status} and can no longer be cancelled`);
    }

    const currency = doc.currency ?? WalletCurrency.PHP;

    await this.walletService.credit({
      userId,
      currency,
      amount: doc.amount,
      source: WalletTxnSource.WITHDRAWAL,
      refKey: `withdrawal-refund:${withdrawalId}:cancel`,
      note:   'Withdrawal request cancelled — amount refunded',
      meta:   { withdrawalId, currency, reason: 'user-cancel' },
    });

    doc.status      = WithdrawalStatus.CANCELLED;
    doc.processedAt = new Date();
    await doc.save();

    return this.format(doc.toObject());
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
   * The wallet was already debited at request time, so this only marks it completed.
   */
  async approve(withdrawalId: string, adminNote = '') {
    const doc = await this.withdrawalModel.findById(withdrawalId);
    if (!doc) throw new NotFoundException('Withdrawal request not found');
    if (doc.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Request is already ${doc.status}`);
    }

    doc.status      = WithdrawalStatus.COMPLETED;
    doc.adminNote   = adminNote;
    doc.processedAt = new Date();
    await doc.save();

    return this.format(doc.toObject());
  }

  /**
   * Admin: reject a pending request. Refunds the amount locked at request time.
   */
  async reject(withdrawalId: string, adminNote = '') {
    const doc = await this.withdrawalModel.findById(withdrawalId);
    if (!doc) throw new NotFoundException('Withdrawal request not found');
    if (doc.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Request is already ${doc.status}`);
    }

    const currency = doc.currency ?? WalletCurrency.PHP;

    await this.walletService.credit({
      userId:   doc.userId.toString(),
      currency,
      amount:   doc.amount,
      source:   WalletTxnSource.WITHDRAWAL,
      refKey:   `withdrawal-refund:${withdrawalId}:reject`,
      note:     'Withdrawal request rejected — amount refunded',
      meta:     { withdrawalId, currency, reason: 'reject-refund' },
    });

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
      contactNumber: doc.contactNumber ?? '',
      notes:         doc.notes ?? '',
      status:        doc.status,
      adminNote:     doc.adminNote ?? '',
      processedAt:   doc.processedAt ?? null,
      createdAt:     doc.createdAt,
    };
  }
}
