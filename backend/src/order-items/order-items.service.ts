import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

@Injectable()
export class OrderItemsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderItemDto) {
    const subtotal = dto.quantity * dto.unitPrice;
    return this.prisma.orderItem.create({
      data: {
        ...dto,
        subtotal,
      },
      include: {
        order: true,
        product: true,
      },
    });
  }

  async findMany(skip = 0, take = 20, orderId?: string) {
    const where: any = {};
    if (orderId) {
      where.orderId = orderId;
    }

    const [data, total] = await Promise.all([
      this.prisma.orderItem.findMany({
        where,
        skip,
        take,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              status: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.orderItem.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id },
      include: {
        order: true,
        product: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`订单明细 ${id} 不存在`);
    }

    return item;
  }

  async update(id: string, dto: UpdateOrderItemDto) {
    const data: any = { ...dto };
    
    // 如果更新了数量或单价，重新计算小计
    if (dto.quantity !== undefined || dto.unitPrice !== undefined) {
      const item = await this.findOne(id);
      const quantity = dto.quantity ?? item.quantity;
      const unitPrice = dto.unitPrice ?? item.unitPrice;
      data.subtotal = quantity * unitPrice;
    }

    return this.prisma.orderItem.update({
      where: { id },
      data,
      include: {
        order: true,
        product: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.orderItem.delete({
      where: { id },
    });
  }
}

