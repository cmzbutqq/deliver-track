import { IsString, IsInt, IsObject, IsOptional, IsEnum, Min } from 'class-validator';
import { WarehouseStatus } from '@prisma/client';

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  address?: { lng: number; lat: number; address: string };

  @IsString()
  @IsOptional()
  managerName?: string;

  @IsString()
  @IsOptional()
  managerPhone?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  currentStock?: number;

  @IsEnum(WarehouseStatus)
  @IsOptional()
  status?: WarehouseStatus;
}

