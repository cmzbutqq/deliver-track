import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateDeliveryZoneDto {
  @IsString()
  name: string;

  @IsObject()
  boundary: {
    type: 'Polygon';
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
  };

  @IsOptional()
  @IsString()
  logistics?: string; // 物流公司名称
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
  @IsString()
  logistics?: string; // 物流公司名称
}

