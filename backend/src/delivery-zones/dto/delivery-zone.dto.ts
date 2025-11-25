import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';

export class CreateDeliveryZoneDto {
  @IsString()
  name: string;

  @IsObject()
  boundary: {
    type: 'Polygon';
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
  };

  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimit?: number; // 配送时效（小时）
}

export class UpdateDeliveryZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  boundary?: {
    type: 'Polygon';
    coordinates: number[][][];
  };

  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimit?: number;
}

