import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  image: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  fullName: string;

  @IsString()
  contactNumber: string;

  @IsString()
  address: string;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  paymentAccountName?: string;

  @IsOptional()
  @IsString()
  paymentAccountNumber?: string;

  @IsOptional()
  @IsString()
  proofImageUrl?: string;
}
