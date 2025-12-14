import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeeSettlementDto } from './dto/create-fee-settlement.dto';

@Injectable()
export class FeeSettlementsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFeeSettlementDto) {
    // 调用存储过程生成结算单
    const result = await this.prisma.callSettleFees(
      dto.merchantId,
      new Date(dto.startDate),
      new Date(dto.endDate),
    );

    if (!result) {
      throw new Error('结算单创建失败');
    }

    // 返回结算单详情
    return this.findOne(result.settlement_id);
  }

  async findMany(skip = 0, take = 20, merchantId?: string) {
    const where: any = {};
    if (merchantId) {
      where.merchantId = merchantId;
    }

    const [data, total] = await Promise.all([
      this.prisma.feeSettlement.findMany({
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
          details: {
            take: 10,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.feeSettlement.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const settlement = await this.prisma.feeSettlement.findUnique({
      where: { id },
      include: {
        merchant: true,
        details: {
          include: {
            order: {
              select: {
                id: true,
                orderNo: true,
                amount: true,
                totalFee: true,
              },
            },
          },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException(`结算单不存在: ${id}`);
    }

    return settlement;
  }

  async updateStatus(id: string, status: string) {
    const settlement = await this.prisma.feeSettlement.findUnique({
      where: { id },
    });

    if (!settlement) {
      throw new NotFoundException(`结算单不存在: ${id}`);
    }

    return this.prisma.feeSettlement.update({
      where: { id },
      data: {
        status: status as any,
        settledAt: status === 'SETTLED' ? new Date() : null,
      },
      include: {
        merchant: true,
      },
    });
  }

  async getDetails(id: string) {
    const settlement = await this.prisma.feeSettlement.findUnique({
      where: { id },
    });

    if (!settlement) {
      throw new NotFoundException(`结算单不存在: ${id}`);
    }

    // 使用视图查询明细
    return this.prisma.queryFeeSettlementDetail(id);
  }
}

