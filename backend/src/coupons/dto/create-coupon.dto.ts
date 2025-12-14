import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { CouponType, CouponStatus } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  merchantId: string;

  @IsString()
  couponCode: string;

  @IsEnum(CouponType)
  couponType: CouponType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @ValidateIf((o) => o.couponType === 'FIXED_AMOUNT')
  discountAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @ValidateIf((o) => o.couponType === 'PERCENTAGE')
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscount?: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validTo: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  usageLimit?: number;

  @IsEnum(CouponStatus)
  @IsOptional()
  status?: CouponStatus;
}

