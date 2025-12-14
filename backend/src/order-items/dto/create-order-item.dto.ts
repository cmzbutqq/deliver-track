import { IsString, IsInt, IsNumber, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  orderId: string;

  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

