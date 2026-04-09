export class CreateWithdrawalDto {
  amount: number;
  currency?: string;       // 'php' (default) or 'gc_points'
  paymentMethod?: string;  // Required only for PHP
  accountName?: string;    // Required only for PHP
  notes?: string;
}
