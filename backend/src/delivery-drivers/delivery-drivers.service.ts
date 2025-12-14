import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDriverDto } from './dto/create-delivery-driver.dto';
import { UpdateDeliveryDriverDto } from './dto/update-delivery-driver.dto';

@Injectable()
export class DeliveryDriversService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDeliveryDriverDto) {
    return this.prisma.deliveryDriver.create({
      data: dto,
      include: {
        vehicle: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findMany(skip = 0, take = 20, status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.deliveryDriver.findMany({
        where,
        skip,
        take,
        include: {
          vehicle: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deliveryDriver.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const driver = await this.prisma.deliveryDriver.findUnique({
      where: { id },
      include: {
        vehicle: true,
        orders: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException(`配送员不存在: ${id}`);
    }

    return driver;
  }

  async update(id: string, dto: UpdateDeliveryDriverDto) {
    const driver = await this.prisma.deliveryDriver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException(`配送员不存在: ${id}`);
    }

    return this.prisma.deliveryDriver.update({
      where: { id },
      data: dto,
      include: {
        vehicle: true,
      },
    });
  }

  async delete(id: string) {
    const driver = await this.prisma.deliveryDriver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException(`配送员不存在: ${id}`);
    }

    await this.prisma.deliveryDriver.delete({
      where: { id },
    });

    return { success: true };
  }

  async getStatistics(id: string) {
    const driver = await this.prisma.deliveryDriver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException(`配送员不存在: ${id}`);
    }

    // 使用视图查询绩效
    const performance = await this.prisma.queryDeliveryDriverPerformance(id);
    const performanceData = performance.length > 0 ? performance[0] : null;

    // 统计订单
    const [totalOrders, deliveredOrders, shippingOrders] = await Promise.all([
      this.prisma.order.count({
        where: { deliveryDriverId: id },
      }),
      this.prisma.order.count({
        where: { deliveryDriverId: id, status: 'DELIVERED' },
      }),
      this.prisma.order.count({
        where: { deliveryDriverId: id, status: 'SHIPPING' },
      }),
    ]);

    return {
      ...driver,
      performance: performanceData,
      statistics: {
        totalOrders,
        deliveredOrders,
        shippingOrders,
        completionRate: totalOrders > 0 ? deliveredOrders / totalOrders : 0,
      },
    };
  }
}

