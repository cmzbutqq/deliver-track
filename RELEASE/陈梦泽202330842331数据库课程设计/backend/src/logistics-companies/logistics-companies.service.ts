import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogisticsCompaniesService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有物流公司列表
   * 按speed降序排列（speed越大配送越快）
   */
  async findAll() {
    return this.prisma.logisticsCompany.findMany({
      orderBy: { speed: 'desc' },
      select: {
        id: true,
        name: true,
        speed: true,
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

