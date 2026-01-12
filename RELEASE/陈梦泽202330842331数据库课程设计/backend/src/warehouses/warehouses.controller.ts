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
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('warehouses')
@UseGuards(JwtAuthGuard)
export class WarehousesController {
  constructor(private warehousesService: WarehousesService) {}

  @Post()
  async create(@Body() dto: CreateWarehouseDto) {
    const warehouse = await this.warehousesService.create(dto);
    return { success: true, data: warehouse };
  }

  @Get()
  async findMany(@Query('skip') skip?: string, @Query('take') take?: string) {
    const result = await this.warehousesService.findMany(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
    );
    return { success: true, ...result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const warehouse = await this.warehousesService.findOne(id);
    return { success: true, data: warehouse };
  }

  @Get(':id/inventory')
  async getInventory(@Param('id') id: string) {
    const inventory = await this.warehousesService.getInventory(id);
    return { success: true, data: inventory };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    const warehouse = await this.warehousesService.update(id, dto);
    return { success: true, data: warehouse };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.warehousesService.delete(id);
    return { success: true, message: '仓库已删除' };
  }
}

