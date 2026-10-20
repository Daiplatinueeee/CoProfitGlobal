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
const ADMIN_FEE_PHP = 50;
const MIN_PHP_PAYOUT = 500;

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
    if (currency !== WalletCurrency.GC_POINTS && dto.amount < MIN_PHP_PAYOUT) {
      throw new BadRequestException(`Minimum payout request is ₱${MIN_PHP_PAYOUT}`);
    }

    let vat           = 0;
    let totalAmount   = dto.amount;
    const paymentMethod = dto.paymentMethod ?? '';
    const accountName   = (dto.accountName ?? '').trim();

    if (currency === WalletCurrency.GC_POINTS) {
      // GC is claimed in person / delivered — admin needs to know who and how to reach them.
      if (!accountName) throw new BadRequestException('Full name is required');
      if (!dto.contactNumber?.trim()) throw new BadRequestException('Contact number is required');
      if (availableBalance < dto.amount) {
        throw new BadRequestException(
          `Insufficient GC balance. Available: ${availableBalance.toLocaleString()} GC, required: ${dto.amount.toLocaleString()} GC`,
        );
      }
    } else {
      // PHP — apply 10% processing fee + ₱50 admin fee on every request
      if (!paymentMethod) throw new BadRequestException('Payment method is required');
      if (paymentMethod !== 'cash' && !accountName) throw new BadRequestException('Account name is required');

      vat         = Math.floor(dto.amount * VAT_RATE);
      totalAmount = dto.amount - vat - ADMIN_FEE_PHP;

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
   * Multiple pending requests are allowed — each one is its own transaction with
   * its own 10% + ₱50 fee, and each locks its amount from the available balance.
   * Requests cannot be edited once submitted; the user may only cancel.
   */
  async submitRequest(userId: string, dto: CreateWithdrawalDto) {
    const currency = (dto.currency as WalletCurrency) ?? WalletCurrency.PHP;
    const uid = this.toObjectId(userId);

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

    // Debit immediately so the balance reflects the locked funds. If the debit
    // fails (e.g. a concurrent request drained the balance), drop the record so
    // no request exists without its matching wallet lock.
    try {
      await this.walletService.debit({
        userId,
        currency,
        amount: dto.amount,
        source: WalletTxnSource.WITHDRAWAL,
        refKey: `withdrawal:${request._id}`,
        note:   currency === WalletCurrency.GC_POINTS
          ? `GC withdrawal request — ${dto.amount.toLocaleString()} GC | ${accountName}`
          : `Withdrawal request — ${paymentMethod} | ${accountName}`,
        meta:   { withdrawalId: request._id.toString(), currency, paymentMethod, accountName },
      });
    } catch (err) {
      await this.withdrawalModel.deleteOne({ _id: request._id });
      throw err;
    }

    return this.format(request.toObject());
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
    return rows.map((r) => this.format(r));
  }

  /**
   * Admin: approve a pending request.
   * The wallet was already debited at request time, so this only marks it completed
   * and records which admin processed it.
   */
  async approve(withdrawalId: string, adminId: string, adminNote = '') {
    const doc = await this.withdrawalModel.findById(withdrawalId);
    if (!doc) throw new NotFoundException('Withdrawal request not found');
    if (doc.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Request is already ${doc.status}`);
    }

    doc.status      = WithdrawalStatus.COMPLETED;
    doc.adminNote   = adminNote;
    doc.processedAt = new Date();
    doc.processedBy = this.toObjectId(adminId);
    await doc.save();

    return this.format(doc.toObject());
  }

  /**
   * Admin: reject a pending request. Refunds the amount locked at request time.
   */
  async reject(withdrawalId: string, adminId: string, adminNote = '') {
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
    doc.processedBy = this.toObjectId(adminId);
    await doc.save();

    return this.format(doc.toObject());
  }

  /**
   * Admin: get all withdrawal requests, optionally filtered by status, currency
   * and a createdAt date range (YYYY-MM-DD, inclusive, Philippine time).
   * Populates the requester and the admin who processed each request so the
   * payout report can show who did what and when.
   */
  async getAllRequests(
    status?: WithdrawalStatus,
    currency?: WalletCurrency,
    from?: string,
    to?: string,
  ) {
    const filter: Record<string, any> = {};
    if (status)   filter.status   = status;
    if (currency) filter.currency = currency;

    const createdAt: Record<string, Date> = {};
    if (from) {
      const d = new Date(`${from}T00:00:00.000+08:00`);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid "from" date');
      createdAt.$gte = d;
    }
    if (to) {
      const d = new Date(`${to}T23:59:59.999+08:00`);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid "to" date');
      createdAt.$lte = d;
    }
    if (Object.keys(createdAt).length) filter.createdAt = createdAt;

    const rows = await this.withdrawalModel
      .find(filter)
      .populate('userId', 'name username email contact')
      .populate('processedBy', 'name username')
      .sort({ createdAt: -1 })
      .lean();
    return rows.map((r) => this.format(r));
  }

  private format(doc: any) {
    // userId / processedBy are populated documents on admin listings, raw ObjectIds elsewhere.
    const user        = doc.userId?.username !== undefined ? doc.userId : null;
    const processedBy = doc.processedBy?.username !== undefined ? doc.processedBy : null;

    return {
      id:            doc._id?.toString?.() ?? doc._id,
      userId:        user ? user._id?.toString() : doc.userId?.toString(),
      user:          user
        ? { name: user.name ?? '', username: user.username ?? '', email: user.email ?? '', contact: user.contact ?? '' }
        : null,
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
      processedBy:   processedBy
        ? { id: processedBy._id?.toString(), name: processedBy.name ?? '', username: processedBy.username ?? '' }
        : null,
      createdAt:     doc.createdAt,
      updatedAt:     doc.updatedAt,
    };
  }
}
