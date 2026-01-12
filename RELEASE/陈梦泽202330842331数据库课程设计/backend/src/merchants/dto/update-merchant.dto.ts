import { IsOptional, IsString, IsObject, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsNumber()
  lng: number;

  @IsNumber()
  lat: number;

  @IsString()
  address: string;
}

export class UpdateMerchantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

