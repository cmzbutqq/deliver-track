import { IsString, IsInt, IsObject, IsOptional, IsEnum, Min } from 'class-validator';
import { WarehouseStatus } from '@prisma/client';

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsObject()
  address: { lng: number; lat: number; address: string };

  @IsString()
  managerName: string;

  @IsString()
  managerPhone: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  currentStock?: number;

  @IsEnum(WarehouseStatus)
  @IsOptional()
  status?: WarehouseStatus;
}

