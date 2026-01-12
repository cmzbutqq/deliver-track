import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { RefundStatus } from '@prisma/client';

@Injectable()
export class RefundsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRefundDto) {
    // 验证支付记录是否存在
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录 ${dto.paymentId} 不存在`);
    }

    // 验证退款金额不超过支付金额
    if (dto.refundAmount > payment.amount) {
      throw new BadRequestException('退款金额不能超过支付金额');
    }

    const data: any = {
      ...dto,
      status: dto.status ?? RefundStatus.PENDING,
      processedAt: dto.status === RefundStatus.COMPLETED ? new Date() : null,
    };

    return this.prisma.refund.create({
      data,
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            amount: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
          },
        },
      },
    });
  }

  async findMany(
    skip = 0,
    take = 20,
    orderId?: string,
    status?: RefundStatus,
  ) {
    const where: any = {};
    if (orderId) {
      where.orderId = orderId;
    }
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        skip,
        take,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.refund.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        order: true,
        payment: true,
      },
    });

    if (!refund) {
      throw new NotFoundException(`退款记录 ${id} 不存在`);
    }

    return refund;
  }

  async update(id: string, dto: UpdateRefundDto) {
    const data: any = { ...dto };
    
    // 如果状态变为COMPLETED，更新处理时间
    if (dto.status === RefundStatus.COMPLETED) {
      data.processedAt = new Date();
    }

    return this.prisma.refund.update({
      where: { id },
      data,
      include: {
        order: true,
        payment: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.refund.delete({
      where: { id },
    });
  }

  async approve(id: string) {
    return this.update(id, { status: RefundStatus.APPROVED });
  }

  async reject(id: string) {
    return this.update(id, { status: RefundStatus.REJECTED });
  }

  async complete(id: string) {
    return this.update(id, { status: RefundStatus.COMPLETED });
  }
}

