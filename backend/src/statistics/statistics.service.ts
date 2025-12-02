import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取总览统计数据
   */
  async getOverview(merchantId: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    // 今日订单数和金额（按商家ID过滤）
    const todayOrders = await this.prisma.order.count({
      where: {
        merchantId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const todayAmountResult = await this.prisma.order.aggregate({
      where: {
        merchantId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { amount: true },
    });

    // 运输中订单数（按商家ID过滤）
    const shippingOrders = await this.prisma.order.count({
      where: {
        merchantId,
        status: 'SHIPPING',
      },
    });

    // 已完成订单数（累计，按商家ID过滤）
    const completedOrders = await this.prisma.order.count({
      where: {
        merchantId,
        status: 'DELIVERED',
      },
    });

    // 待发货订单数（按商家ID过滤）
    const pendingOrders = await this.prisma.order.count({
      where: {
        merchantId,
        status: 'PENDING',
      },
    });

    // 已取消订单数（按商家ID过滤）
    const cancelledOrders = await this.prisma.order.count({
      where: {
        merchantId,
        status: 'CANCELLED',
      },
    });

    return {
      todayOrders,
      todayAmount: todayAmountResult._sum.amount || 0,
      shippingOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
    };
  }

  /**
   * 获取配送区域统计数据
   */
  async getZoneStatistics(merchantId: string) {
    // 获取当前商家的所有配送区域
    const zones = await this.prisma.deliveryZone.findMany({
      where: { merchantId },
    });

    // 获取所有已送达的订单（按商家ID过滤）
    const allOrders = await this.prisma.order.findMany({
      where: {
        merchantId,
        status: 'DELIVERED',
        actualTime: { not: null },
      },
      select: {
        createdAt: true,
        actualTime: true,
        destination: true,
      },
    });

    const statistics = [];
    for (const zone of zones) {
      const boundary = zone.boundary as any;
      const polygon = boundary.coordinates[0]; // GeoJSON Polygon 的第一层是外环

      // 使用射线法判断订单是否在配送区域内
      const zoneOrders = allOrders.filter((order) => {
        const destination = order.destination as any;
        if (!destination || typeof destination.lng !== 'number' || typeof destination.lat !== 'number') {
          return false;
        }
        return this.isPointInPolygon(
          { lng: destination.lng, lat: destination.lat },
          polygon,
        );
      });

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
   * 射线法判断点是否在多边形内
   */
  private isPointInPolygon(point: { lng: number; lat: number }, polygon: number[][]): boolean {
    const { lng, lat } = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];

      const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * 获取物流公司统计数据
   */
  async getLogisticsStatistics(merchantId: string) {
    const companies = await this.prisma.logisticsCompany.findMany();

    const statistics = [];
    for (const company of companies) {
      // 获取已送达的订单（按商家ID和物流公司过滤）
      const orders = await this.prisma.order.findMany({
        where: {
          merchantId,
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

