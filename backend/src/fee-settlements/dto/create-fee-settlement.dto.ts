import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { SettlementStatus } from '@prisma/client';

export class CreateFeeSettlementDto {
  @IsString()
  merchantId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;
}

