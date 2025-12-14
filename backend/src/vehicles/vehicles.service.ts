import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: dto,
      include: {
        drivers: true,
      },
    });
  }

  async findMany(skip = 0, take = 20) {
    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        skip,
        take,
        include: {
          drivers: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vehicle.count(),
    ]);

    return { data, total, skip, take };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        drivers: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`车辆不存在: ${id}`);
    }

    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException(`车辆不存在: ${id}`);
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
      include: {
        drivers: true,
      },
    });
  }

  async delete(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException(`车辆不存在: ${id}`);
    }

    await this.prisma.vehicle.delete({
      where: { id },
    });

    return { success: true };
  }
}

