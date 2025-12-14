import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { DriverStatus } from '@prisma/client';

export class CreateDeliveryDriverDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  licenseNumber: string;

  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;

  @IsObject()
  @IsOptional()
  currentLocation?: { lng: number; lat: number };
}

