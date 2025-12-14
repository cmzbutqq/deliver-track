import { IsString, IsOptional, IsEnum, IsObject, IsInt, IsNumber, Min, Max } from 'class-validator';
import { DriverStatus } from '@prisma/client';

export class UpdateDeliveryDriverDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;

  @IsObject()
  @IsOptional()
  currentLocation?: { lng: number; lat: number };

  @IsInt()
  @IsOptional()
  @Min(0)
  totalOrders?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(5)
  avgRating?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  onTimeRate?: number;
}

