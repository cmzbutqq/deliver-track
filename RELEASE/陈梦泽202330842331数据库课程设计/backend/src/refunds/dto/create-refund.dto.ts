import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { RefundStatus } from '@prisma/client';

export class CreateRefundDto {
  @IsString()
  orderId: string;

  @IsString()
  paymentId: string;

  @IsNumber()
  @Min(0)
  refundAmount: number;

  @IsString()
  @IsOptional()
  refundReason?: string;

  @IsEnum(RefundStatus)
  @IsOptional()
  status?: RefundStatus;
}

