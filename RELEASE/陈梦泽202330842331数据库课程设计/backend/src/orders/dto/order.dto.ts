import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  receiverName: string;

  @IsString()
  receiverPhone: string;

  @IsString()
  receiverAddress: string;

  @IsString()
  productName: string;

  @IsNumber()
  @Min(1)
  productQuantity: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsObject()
  origin?: {
    lng: number;
    lat: number;
    address: string;
  };

  @IsObject()
  destination: {
    lng: number;
    lat: number;
    address: string;
  };

  @IsOptional()
  @IsString()
  logistics?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  receiverPhone?: string;

  @IsOptional()
  @IsString()
  receiverAddress?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsNumber()
  productQuantity?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  logistics?: string;
}

export class ShipOrderDto {
  @IsOptional()
  @IsNumber()
  interval?: number; // 轨迹推送间隔（毫秒）
}

