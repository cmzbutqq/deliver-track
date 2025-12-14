import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponStatus } from '@prisma/client';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    // 验证有效期
    if (new Date(dto.validTo) <= new Date(dto.validFrom)) {
      throw new BadRequestException('有效期结束时间必须大于开始时间');
    }

    const data: any = {
      ...dto,
      validFrom: new Date(dto.validFrom),
      validTo: new Date(dto.validTo),
      usageLimit: dto.usageLimit ?? 1,
      usedCount: 0,
      status: dto.status ?? CouponStatus.ACTIVE,
    };

    return this.prisma.coupon.create({
      data,
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findMany(
    skip = 0,
    take = 20,
    merchantId?: string,
    status?: CouponStatus,
    couponCode?: string,
  ) {
    const where: any = {};
    if (merchantId) {
      where.merchantId = merchantId;
    }
    if (status) {
      where.status = status;
    }
    if (couponCode) {
      where.couponCode = { contains: couponCode };
    }

    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              couponUsages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        merchant: true,
        couponUsages: {
          take: 10,
          orderBy: { usedAt: 'desc' },
          include: {
            order: {
              select: {
                id: true,
                orderNo: true,
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException(`优惠券 ${id} 不存在`);
    }

    return coupon;
  }

  async findByCode(couponCode: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { couponCode },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException(`优惠券代码 ${couponCode} 不存在`);
    }

    // 检查优惠券是否有效
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      throw new BadRequestException('优惠券已过期或尚未生效');
    }

    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('优惠券不可用');
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('优惠券使用次数已达上限');
    }

    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto) {
    const data: any = { ...dto };
    
    if (dto.validFrom) {
      data.validFrom = new Date(dto.validFrom);
    }
    if (dto.validTo) {
      data.validTo = new Date(dto.validTo);
    }

    return this.prisma.coupon.update({
      where: { id },
      data,
      include: {
        merchant: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.coupon.delete({
      where: { id },
    });
  }

  async useCoupon(couponId: string, orderId: string, customerId: string, orderAmount: number) {
    const coupon = await this.findOne(couponId);

    // 验证优惠券
    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('优惠券不可用');
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      throw new BadRequestException('优惠券已过期或尚未生效');
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('优惠券使用次数已达上限');
    }

    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      throw new BadRequestException(`订单金额需达到 ${coupon.minOrderAmount} 元才能使用此优惠券`);
    }

    // 计算折扣金额
    let discountAmount = 0;
    if (coupon.couponType === 'FIXED_AMOUNT') {
      discountAmount = coupon.discountAmount ?? 0;
    } else if (coupon.couponType === 'PERCENTAGE') {
      discountAmount = orderAmount * (coupon.discountPercent ?? 0) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    }

    // 创建使用记录并更新优惠券
    const [couponUsage] = await Promise.all([
      this.prisma.couponUsage.create({
        data: {
          couponId,
          orderId,
          customerId,
          discountAmount,
        },
      }),
      this.prisma.coupon.update({
        where: { id: couponId },
        data: {
          usedCount: { increment: 1 },
        },
      }),
    ]);

    return couponUsage;
  }
}

