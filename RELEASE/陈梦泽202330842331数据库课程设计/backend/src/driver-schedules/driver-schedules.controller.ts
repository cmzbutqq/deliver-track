import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { DriverSchedulesService } from './driver-schedules.service';
import { CreateDriverScheduleDto } from './dto/create-driver-schedule.dto';

@Controller('driver-schedules')
export class DriverSchedulesController {
  constructor(private readonly driverSchedulesService: DriverSchedulesService) {}

  @Post()
  create(@Body() createDriverScheduleDto: CreateDriverScheduleDto) {
    return this.driverSchedulesService.create(createDriverScheduleDto);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('driverId') driverId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.driverSchedulesService.findMany(skip, take, driverId, startDate, endDate);
  }

  @Get('week-summary')
  getWeekSummary(@Query('driverId') driverId?: string) {
    return this.driverSchedulesService.getWeekSummary(driverId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.driverSchedulesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.driverSchedulesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.driverSchedulesService.remove(id);
  }
}

