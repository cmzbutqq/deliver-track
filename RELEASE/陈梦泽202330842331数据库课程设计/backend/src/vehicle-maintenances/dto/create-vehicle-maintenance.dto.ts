import { IsString, IsDateString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { MaintenanceType } from '@prisma/client';

export class CreateVehicleMaintenanceDto {
  @IsString()
  vehicleId: string;

  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @IsDateString()
  maintenanceDate: string;

  @IsNumber()
  cost: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;
}

