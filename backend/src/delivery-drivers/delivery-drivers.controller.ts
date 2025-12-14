import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeliveryDriversService } from './delivery-drivers.service';
import { CreateDeliveryDriverDto } from './dto/create-delivery-driver.dto';
import { UpdateDeliveryDriverDto } from './dto/update-delivery-driver.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('delivery-drivers')
@UseGuards(JwtAuthGuard)
export class DeliveryDriversController {
  constructor(private deliveryDriversService: DeliveryDriversService) {}

  @Post()
  async create(@Body() dto: CreateDeliveryDriverDto) {
    const driver = await this.deliveryDriversService.create(dto);
    return {
      success: true,
      data: driver,
    };
  }

  @Get()
  async findMany(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.deliveryDriversService.findMany(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
      status,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const driver = await this.deliveryDriversService.findOne(id);
    return {
      success: true,
      data: driver,
    };
  }

  @Get(':id/statistics')
  async getStatistics(@Param('id') id: string) {
    const statistics = await this.deliveryDriversService.getStatistics(id);
    return {
      success: true,
      data: statistics,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDeliveryDriverDto) {
    const driver = await this.deliveryDriversService.update(id, dto);
    return {
      success: true,
      data: driver,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.deliveryDriversService.delete(id);
    return {
      success: true,
      message: '配送员已删除',
    };
  }
}

