import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { VehicleType, VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @IsString()
  plateNumber: string;

  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @IsNumber()
  @Min(0.1)
  loadCapacity: number;

  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsDateString()
  @IsOptional()
  lastMaintenanceDate?: string;
}

