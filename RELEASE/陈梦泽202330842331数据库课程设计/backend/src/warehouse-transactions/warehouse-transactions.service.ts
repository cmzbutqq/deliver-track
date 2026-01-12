import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseTransactionDto } from './dto/create-warehouse-transaction.dto';

@Injectable()
export class WarehouseTransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWarehouseTransactionDto) {
    return this.prisma.warehouseTransaction.create({
      data: {
        ...dto,
        transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
          },
        },
      },
    });
  }

  async findMany(
    skip = 0,
    take = 20,
    warehouseId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {};
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.warehouseTransaction.findMany({
        where,
        skip,
        take,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNo: true,
            },
          },
        },
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.warehouseTransaction.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.warehouseTransaction.findUnique({
      where: { id },
      include: {
        warehouse: true,
        order: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`出入库记录不存在: ${id}`);
    }

    return transaction;
  }

  async getStatistics(warehouseId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate);
      }
    }

    const transactions = await this.prisma.warehouseTransaction.findMany({
      where,
      select: {
        transactionType: true,
        quantity: true,
        transactionDate: true,
      },
    });

    const stats = {
      totalIn: 0,
      totalOut: 0,
      totalInventory: 0,
      totalTransfer: 0,
      byType: {} as Record<string, number>,
    };

    for (const txn of transactions) {
      switch (txn.transactionType) {
        case 'IN':
          stats.totalIn += txn.quantity;
          break;
        case 'OUT':
          stats.totalOut += txn.quantity;
          break;
        case 'INVENTORY':
          stats.totalInventory += txn.quantity;
          break;
        case 'TRANSFER':
          stats.totalTransfer += txn.quantity;
          break;
      }
      stats.byType[txn.transactionType] = (stats.byType[txn.transactionType] || 0) + txn.quantity;
    }

    return stats;
  }
}

