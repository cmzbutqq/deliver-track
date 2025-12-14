import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  merchantId: string;

  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Min(0.01)
  weight: number;

  @IsNumber()
  @Min(0.01)
  volume: number;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

