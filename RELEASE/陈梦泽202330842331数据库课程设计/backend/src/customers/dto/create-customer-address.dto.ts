import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class CreateCustomerAddressDto {
  @IsString()
  receiverName: string;

  @IsString()
  receiverPhone: string;

  @IsObject()
  address: {
    lng: number;
    lat: number;
    address: string;
  };

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

