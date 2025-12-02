import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryZoneDto, UpdateDeliveryZoneDto } from './dto/delivery-zone.dto';

@Injectable()
export class DeliveryZonesService {
  constructor(private prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateDeliveryZoneDto) {
    return this.prisma.deliveryZone.create({
      data: {
        merchantId,
        name: dto.name,
        boundary: dto.boundary,
        logistics: dto.logistics || '顺丰速运',
      },
    });
  }

  async findAll(merchantId: string) {
    return this.prisma.deliveryZone.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, merchantId: string) {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException('配送区域不存在');
    }

    if (zone.merchantId !== merchantId) {
      throw new BadRequestException('无权限访问此配送区域');
    }

    return zone;
  }

  async update(id: string, merchantId: string, dto: UpdateDeliveryZoneDto) {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException('配送区域不存在');
    }

    if (zone.merchantId !== merchantId) {
      throw new BadRequestException('无权限操作此配送区域');
    }

    return this.prisma.deliveryZone.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, merchantId: string) {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException('配送区域不存在');
    }

    if (zone.merchantId !== merchantId) {
      throw new BadRequestException('无权限操作此配送区域');
    }

    return this.prisma.deliveryZone.delete({
      where: { id },
    });
  }

  /**
   * 检查某个点是否在配送区域内
   */
  async checkPointInZone(zoneId: string, point: { lng: number; lat: number }): Promise<boolean> {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      return false;
    }

    const boundary = zone.boundary as any;
    return this.isPointInPolygon(point, boundary.coordinates[0]);
  }

  /**
   * 获取某个配送区域内的订单
   */
  async getOrdersInZone(zoneId: string, merchantId: string) {
    const zone = await this.findOne(zoneId, merchantId);
    const boundary = zone.boundary as any;

    const orders = await this.prisma.order.findMany({
      where: { merchantId },
      include: {
        route: true,
      },
    });

    // 过滤出在配送区域内的订单
    const ordersInZone = orders.filter((order) => {
      const destination = order.destination as any;
      return this.isPointInPolygon(
        { lng: destination.lng, lat: destination.lat },
        boundary.coordinates[0],
      );
    });

    return ordersInZone;
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
}
