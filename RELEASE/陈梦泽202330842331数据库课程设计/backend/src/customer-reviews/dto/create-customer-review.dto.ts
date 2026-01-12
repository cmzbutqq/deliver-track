import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateCustomerReviewDto {
  @IsString()
  orderId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  reviewerName: string;

  @IsString()
  @IsOptional()
  reviewerPhone?: string;
}

