import { IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateWarehouseTransactionDto {
  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsNumber()
  quantity: number;

  @IsString()
  operator: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}

