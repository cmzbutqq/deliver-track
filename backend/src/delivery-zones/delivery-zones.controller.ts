import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DeliveryZonesService } from './delivery-zones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDeliveryZoneDto, UpdateDeliveryZoneDto } from './dto/delivery-zone.dto';

@Controller('delivery-zones')
@UseGuards(JwtAuthGuard)
export class DeliveryZonesController {
  constructor(private deliveryZonesService: DeliveryZonesService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateDeliveryZoneDto) {
    return this.deliveryZonesService.create(req.user.userId, dto);
  }

  @Get()
  async findAll(@Request() req) {
    return this.deliveryZonesService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.deliveryZonesService.findOne(id, req.user.userId);
  }

  @Get(':id/orders')
  async getOrdersInZone(@Param('id') id: string, @Request() req) {
    return this.deliveryZonesService.getOrdersInZone(id, req.user.userId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateDeliveryZoneDto) {
    return this.deliveryZonesService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.deliveryZonesService.delete(id, req.user.userId);
  }
}

