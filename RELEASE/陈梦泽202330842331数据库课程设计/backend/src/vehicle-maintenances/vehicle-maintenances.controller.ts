import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { VehicleMaintenancesService } from './vehicle-maintenances.service';
import { CreateVehicleMaintenanceDto } from './dto/create-vehicle-maintenance.dto';

@Controller('vehicle-maintenances')
export class VehicleMaintenancesController {
  constructor(private readonly vehicleMaintenancesService: VehicleMaintenancesService) {}

  @Post()
  create(@Body() createVehicleMaintenanceDto: CreateVehicleMaintenanceDto) {
    return this.vehicleMaintenancesService.create(createVehicleMaintenanceDto);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.vehicleMaintenancesService.findMany(skip, take, vehicleId);
  }

  @Get('upcoming')
  getUpcoming() {
    return this.vehicleMaintenancesService.getUpcoming();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehicleMaintenancesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.vehicleMaintenancesService.update(id, data);
  }
}

