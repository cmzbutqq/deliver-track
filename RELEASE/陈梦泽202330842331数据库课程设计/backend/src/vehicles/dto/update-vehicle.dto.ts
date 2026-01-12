import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { VehicleType, VehicleStatus } from '@prisma/client';

export class UpdateVehicleDto {
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @IsNumber()
  @Min(0.1)
  @IsOptional()
  loadCapacity?: number;

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

