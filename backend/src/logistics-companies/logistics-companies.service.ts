import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogisticsCompaniesService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有物流公司列表
   * 按时效升序排列
   */
  async findAll() {
    return this.prisma.logisticsCompany.findMany({
      orderBy: { timeLimit: 'asc' },
      select: {
        id: true,
        name: true,
        timeLimit: true,
      },
    });
  }

  /**
   * 根据名称查找物流公司
   */
  async findByName(name: string) {
    return this.prisma.logisticsCompany.findUnique({
      where: { name },
    });
  }
}

