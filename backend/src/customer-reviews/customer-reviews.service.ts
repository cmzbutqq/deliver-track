import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';

@Injectable()
export class CustomerReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerReviewDto) {
    // 检查订单是否存在
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException(`订单不存在: ${dto.orderId}`);
    }

    return this.prisma.customerReview.create({
      data: dto,
      include: {
        order: {
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findMany(skip = 0, take = 20, orderId?: string, merchantId?: string) {
    const where: any = {};
    if (orderId) {
      where.orderId = orderId;
    }
    if (merchantId) {
      where.order = {
        merchantId,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.customerReview.findMany({
        where,
        skip,
        take,
        include: {
          order: {
            include: {
              merchant: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customerReview.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findOne(id: string) {
    const review = await this.prisma.customerReview.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`评价不存在: ${id}`);
    }

    return review;
  }

  async getStatistics(merchantId?: string) {
    const where: any = {};
    if (merchantId) {
      where.order = {
        merchantId,
      };
    }

    const [total, avgRating, ratingDistribution] = await Promise.all([
      this.prisma.customerReview.count({ where }),
      this.prisma.customerReview.aggregate({
        where,
        _avg: {
          rating: true,
        },
      }),
      this.prisma.customerReview.groupBy({
        by: ['rating'],
        where,
        _count: {
          rating: true,
        },
      }),
    ]);

    return {
      total,
      avgRating: avgRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.reduce((acc, item) => {
        acc[item.rating] = item._count.rating;
        return acc;
      }, {} as Record<number, number>),
    };
  }
}

