import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerReviewsService } from './customer-reviews.service';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('customer-reviews')
export class CustomerReviewsController {
  constructor(private customerReviewsService: CustomerReviewsService) {}

  @Post()
  async create(@Body() dto: CreateCustomerReviewDto) {
    const review = await this.customerReviewsService.create(dto);
    return { success: true, data: review };
  }

  @Get()
  async findMany(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('orderId') orderId?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    const result = await this.customerReviewsService.findMany(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
      orderId,
      merchantId,
    );
    return { success: true, ...result };
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard)
  async getStatistics(@Query('merchantId') merchantId?: string) {
    const statistics = await this.customerReviewsService.getStatistics(merchantId);
    return { success: true, data: statistics };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const review = await this.customerReviewsService.findOne(id);
    return { success: true, data: review };
  }
}

