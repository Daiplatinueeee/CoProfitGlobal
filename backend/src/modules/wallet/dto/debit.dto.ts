import { IsEnum, IsMongoId, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { WalletCurrency, WalletTxnSource } from '../schemas/wallet-transaction.schema';

export class DebitDto {
  @IsMongoId()
  userId: string;

  @IsEnum(WalletCurrency)
  currency: WalletCurrency;

  @IsNumber()
  @Min(0.000001)
  amount: number;

  @IsEnum(WalletTxnSource)
  source: WalletTxnSource;

  // must be unique (idempotency key)
  @IsString()
  refKey: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}