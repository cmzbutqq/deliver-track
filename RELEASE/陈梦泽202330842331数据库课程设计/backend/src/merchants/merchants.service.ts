import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    return this.prisma.merchant.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    id: string,
    data: { name?: string; phone?: string; address?: any },
  ) {
    return this.prisma.merchant.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        address: true,
        updatedAt: true,
      },
    });
  }
}

