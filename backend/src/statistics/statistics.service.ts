import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取总览统计数据
   */
  async getOverview(dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    // 今日订单数和金额
    const todayOrders = await this.prisma.order.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const todayAmountResult = await this.prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { amount: true },
    });

    // 运输中订单数
    const shippingOrders = await this.prisma.order.count({
      where: { status: 'SHIPPING' },
    });

    // 已完成订单数（累计）
    const completedOrders = await this.prisma.order.count({
      where: { status: 'DELIVERED' },
    });

    return {
      todayOrders,
      todayAmount: todayAmountResult._sum.amount || 0,
      shippingOrders,
      completedOrders,
    };
  }

  /**
   * 获取配送区域统计数据
   */
  async getZoneStatistics() {
    // 获取所有配送区域
    const zones = await this.prisma.deliveryZone.findMany();

    const statistics = [];
    for (const zone of zones) {
      // 获取已送达的订单
      const orders = await this.prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          actualTime: { not: null },
        },
        select: {
          createdAt: true,
          actualTime: true,
          destination: true,
        },
      });

      // 使用简化的区域判断（实际应用中需要使用射线法判断点是否在多边形内）
      // 这里我们统计所有订单，因为地理计算较复杂
      let zoneOrders = orders;

      // 计算平均配送时长
      let totalTime = 0;
      for (const order of zoneOrders) {
        const time =
          order.actualTime.getTime() - order.createdAt.getTime();
        totalTime += time / (1000 * 60 * 60); // 转换为小时
      }

      const avgDeliveryTime =
        zoneOrders.length > 0 ? totalTime / zoneOrders.length : 0;

      statistics.push({
        zoneName: zone.name,
        orderCount: zoneOrders.length,
        avgDeliveryTime: parseFloat(avgDeliveryTime.toFixed(2)),
      });
    }

    return statistics;
  }

  /**
   * 获取物流公司统计数据
   */
  async getLogisticsStatistics() {
    const companies = await this.prisma.logisticsCompany.findMany();

    const statistics = [];
    for (const company of companies) {
      const orders = await this.prisma.order.findMany({
        where: {
          logistics: company.name,
          status: 'DELIVERED',
          actualTime: { not: null },
        },
        select: {
          createdAt: true,
          estimatedTime: true,
          actualTime: true,
        },
      });

      // 计算平均配送时长和准点率
      let totalTime = 0;
      let onTimeCount = 0;

      for (const order of orders) {
        const time =
          order.actualTime.getTime() - order.createdAt.getTime();
        totalTime += time / (1000 * 60 * 60); // 转换为小时

        // 判断是否准点（实际送达时间 <= 预计送达时间）
        if (order.actualTime <= order.estimatedTime) {
          onTimeCount++;
        }
      }

      const avgDeliveryTime =
        orders.length > 0 ? totalTime / orders.length : 0;
      const onTimeRate = orders.length > 0 ? onTimeCount / orders.length : 0;

      statistics.push({
        companyName: company.name,
        orderCount: orders.length,
        avgDeliveryTime: parseFloat(avgDeliveryTime.toFixed(2)),
        onTimeRate: parseFloat(onTimeRate.toFixed(2)),
      });
    }

    return statistics;
  }
}

