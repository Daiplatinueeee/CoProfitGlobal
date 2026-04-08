export class CreateWithdrawalDto {
  amount: number;
  paymentMethod: string;
  accountName: string;
  notes?: string;
}
