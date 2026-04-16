import { IsEnum, IsMongoId, IsNumber, IsString, Min } from 'class-validator';
import { PurchasePaymentMethod } from '../schemas/unilevel-purchase.schema';

export class SubmitPurchaseDto {
  @IsMongoId()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEnum(PurchasePaymentMethod)
  paymentMethod: string;

  @IsString()
  proofImageUrl: string;
}
