import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({
      data: dto,
    });
  }

  async findMany(skip = 0, take = 20) {
    const [data, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        skip,
        take,
        include: {
          orders: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.warehouse.count(),
    ]);

    return { data, total, skip, take };
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        orders: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`仓库不存在: ${id}`);
    }

    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`仓库不存在: ${id}`);
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`仓库不存在: ${id}`);
    }

    await this.prisma.warehouse.delete({
      where: { id },
    });

    return { success: true };
  }

  async getInventory(id: string) {
    const inventory = await this.prisma.queryWarehouseInventory(id);
    return inventory.length > 0 ? inventory[0] : null;
  }
}

