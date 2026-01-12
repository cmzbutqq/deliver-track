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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Post()
  async create(@Body() dto: CreateVehicleDto) {
    const vehicle = await this.vehiclesService.create(dto);
    return { success: true, data: vehicle };
  }

  @Get()
  async findMany(@Query('skip') skip?: string, @Query('take') take?: string) {
    const result = await this.vehiclesService.findMany(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
    );
    return { success: true, ...result };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const vehicle = await this.vehiclesService.findOne(id);
    return { success: true, data: vehicle };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    const vehicle = await this.vehiclesService.update(id, dto);
    return { success: true, data: vehicle };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.vehiclesService.delete(id);
    return { success: true, message: '车辆已删除' };
  }
}

