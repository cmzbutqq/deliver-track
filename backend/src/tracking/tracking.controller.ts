import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('tracking')
export class TrackingController {
  constructor(private prisma: PrismaService) {}

  @Get(':orderNo')
  async track(@Param('orderNo') orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        route: true,
        timeline: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        message: '订单不存在',
      };
    }

    return {
      success: true,
      data: order,
    };
  }
}

