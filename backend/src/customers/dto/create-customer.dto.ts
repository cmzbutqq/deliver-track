import { IsString, IsOptional, IsEmail, IsObject } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  idCard?: string;

  @IsOptional()
  @IsObject()
  defaultAddress?: {
    lng: number;
    lat: number;
    address: string;
  };
}

