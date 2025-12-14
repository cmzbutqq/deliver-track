import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverScheduleDto } from './dto/create-driver-schedule.dto';

@Injectable()
export class DriverSchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDriverScheduleDto) {
    // 调用存储过程创建排班
    const result = await this.prisma.callAssignDriverSchedule(
      dto.driverId,
      new Date(dto.workDate),
      dto.shiftType,
    );

    if (!result) {
      throw new Error('排班创建失败');
    }

    return this.findOne(result.schedule_id);
  }

  async findMany(
    skip = 0,
    take = 20,
    driverId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {};
    if (driverId) {
      where.driverId = driverId;
    }
    if (startDate || endDate) {
      where.workDate = {};
      if (startDate) {
        where.workDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.workDate.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.driverSchedule.findMany({
        where,
        skip,
        take,
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: [
          { workDate: 'desc' },
          { shiftType: 'asc' },
        ],
      }),
      this.prisma.driverSchedule.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const schedule = await this.prisma.driverSchedule.findUnique({
      where: { id },
      include: {
        driver: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException(`排班记录不存在: ${id}`);
    }

    return schedule;
  }

  async update(id: string, data: any) {
    const schedule = await this.prisma.driverSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`排班记录不存在: ${id}`);
    }

    return this.prisma.driverSchedule.update({
      where: { id },
      data,
      include: {
        driver: true,
      },
    });
  }

  async remove(id: string) {
    const schedule = await this.prisma.driverSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`排班记录不存在: ${id}`);
    }

    return this.prisma.driverSchedule.delete({
      where: { id },
    });
  }

  async getWeekSummary(driverId?: string) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay()); // 本周一
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // 本周日

    const where: any = {
      workDate: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (driverId) {
      where.driverId = driverId;
    }

    return this.prisma.driverSchedule.findMany({
      where,
      include: {
        driver: true,
      },
      orderBy: [
        { workDate: 'asc' },
        { shiftType: 'asc' },
      ],
    });
  }
}

