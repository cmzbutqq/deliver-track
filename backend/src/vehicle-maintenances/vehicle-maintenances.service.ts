import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleMaintenanceDto } from './dto/create-vehicle-maintenance.dto';

@Injectable()
export class VehicleMaintenancesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVehicleMaintenanceDto) {
    const maintenance = await this.prisma.vehicleMaintenance.create({
      data: {
        ...dto,
        maintenanceDate: new Date(dto.maintenanceDate),
        nextMaintenanceDate: dto.nextMaintenanceDate ? new Date(dto.nextMaintenanceDate) : null,
      },
      include: {
        vehicle: true,
      },
    });

    // 更新车辆的最后维修日期
    await this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data: {
        lastMaintenanceDate: new Date(dto.maintenanceDate),
      },
    });

    return maintenance;
  }

  async findMany(skip = 0, take = 20, vehicleId?: string) {
    const where: any = {};
    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicleMaintenance.findMany({
        where,
        skip,
        take,
        include: {
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              vehicleType: true,
            },
          },
        },
        orderBy: { maintenanceDate: 'desc' },
      }),
      this.prisma.vehicleMaintenance.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const maintenance = await this.prisma.vehicleMaintenance.findUnique({
      where: { id },
      include: {
        vehicle: true,
      },
    });

    if (!maintenance) {
      throw new NotFoundException(`维修记录不存在: ${id}`);
    }

    return maintenance;
  }

  async update(id: string, data: any) {
    const maintenance = await this.prisma.vehicleMaintenance.findUnique({
      where: { id },
    });

    if (!maintenance) {
      throw new NotFoundException(`维修记录不存在: ${id}`);
    }

    if (data.maintenanceDate) {
      data.maintenanceDate = new Date(data.maintenanceDate);
    }
    if (data.nextMaintenanceDate) {
      data.nextMaintenanceDate = new Date(data.nextMaintenanceDate);
    }

    return this.prisma.vehicleMaintenance.update({
      where: { id },
      data,
      include: {
        vehicle: true,
      },
    });
  }

  async getUpcoming() {
    // 调用存储过程获取即将到期维修的车辆
    const result = await this.prisma.callCheckVehicleMaintenance();
    return result?.vehicles || [];
  }
}

