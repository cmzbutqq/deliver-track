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
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderStatus } from '@prisma/client';
import { CreateOrderDto, UpdateOrderDto, ShipOrderDto } from './dto/order.dto';
import { BatchOperationDto } from './dto/batch-operation.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, dto);
  }

  @Post('batch/ship')
  @UseGuards(JwtAuthGuard)
  async batchShip(@Request() req, @Body() dto: BatchOperationDto) {
    const result = await this.ordersService.batchShip(
      req.user.userId,
      dto.orderIds,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Delete('batch')
  @UseGuards(JwtAuthGuard)
  async batchDelete(@Request() req, @Body() dto: BatchOperationDto) {
    const result = await this.ordersService.batchDelete(
      req.user.userId,
      dto.orderIds,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req,
    @Query('status') status?: OrderStatus,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.ordersService.findAll(req.user.userId, status, sortBy, sortOrder);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, req.user.userId, dto);
  }

  @Post(':id/ship')
  @UseGuards(JwtAuthGuard)
  async ship(@Param('id') id: string, @Request() req, @Body() dto?: ShipOrderDto) {
    return this.ordersService.ship(id, req.user.userId, dto);
  }

  @Post(':id/deliver')
  @UseGuards(JwtAuthGuard)
  async deliver(@Param('id') id: string) {
    return this.ordersService.deliver(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req) {
    return this.ordersService.delete(id, req.user.userId);
  }
}
