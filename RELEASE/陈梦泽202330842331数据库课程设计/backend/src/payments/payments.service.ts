import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    const data: any = {
      ...dto,
      status: dto.status ?? PaymentStatus.PENDING,
      paidAt: dto.status === PaymentStatus.SUCCESS ? new Date() : null,
    };

    return this.prisma.payment.create({
      data,
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            amount: true,
            status: true,
          },
        },
      },
    });
  }

  async findMany(
    skip = 0,
    take = 20,
    orderId?: string,
    status?: PaymentStatus,
    paymentMethod?: string,
  ) {
    const where: any = {};
    if (orderId) {
      where.orderId = orderId;
    }
    if (status) {
      where.status = status;
    }
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              amount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
        refunds: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录 ${id} 不存在`);
    }

    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    const data: any = { ...dto };
    
    // 如果状态变为SUCCESS，更新支付时间
    if (dto.status === PaymentStatus.SUCCESS) {
      data.paidAt = new Date();
    }

    return this.prisma.payment.update({
      where: { id },
      data,
      include: {
        order: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.payment.delete({
      where: { id },
    });
  }

  async getStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [total, success, failed, totalAmount, successAmount] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.SUCCESS } }),
      this.prisma.payment.count({ where: { ...where, status: PaymentStatus.FAILED } }),
      this.prisma.payment.aggregate({
        where,
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...where, status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
    ]);

    return {
      total,
      success,
      failed,
      successRate: total > 0 ? success / total : 0,
      totalAmount: totalAmount._sum.amount ?? 0,
      successAmount: successAmount._sum.amount ?? 0,
    };
  }
}

