import { IsString, IsDateString, IsEnum } from 'class-validator';
import { ShiftType } from '@prisma/client';

export class CreateDriverScheduleDto {
  @IsString()
  driverId: string;

  @IsDateString()
  workDate: string;

  @IsEnum(ShiftType)
  shiftType: ShiftType;
}

