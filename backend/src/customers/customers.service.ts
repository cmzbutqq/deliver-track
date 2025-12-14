import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: dto,
      include: {
        addresses: true,
      },
    });
  }

  async findMany(skip = 0, take = 20, phone?: string) {
    const where: any = {};
    if (phone) {
      where.phone = { contains: phone };
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        include: {
          addresses: {
            where: { isDefault: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`客户不存在: ${id}`);
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`客户不存在: ${id}`);
    }

    return this.prisma.customer.update({
      where: { id },
      data: dto,
      include: {
        addresses: true,
      },
    });
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`客户不存在: ${id}`);
    }

    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async getAddresses(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`客户不存在: ${customerId}`);
    }

    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async addAddress(customerId: string, dto: CreateCustomerAddressDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`客户不存在: ${customerId}`);
    }

    // 如果设置为默认地址，先取消其他默认地址
    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.create({
      data: {
        ...dto,
        customerId,
      },
    });
  }

  async getPoints(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`客户不存在: ${customerId}`);
    }

    const points = await this.prisma.customerPoint.findUnique({
      where: { customerId },
    });

    return points || {
      id: '',
      customerId,
      totalPoints: 0,
      usedPoints: 0,
      availablePoints: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getComplaints(customerId: string, skip = 0, take = 20) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`客户不存在: ${customerId}`);
    }

    const [data, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where: { customerId },
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
          handler: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.complaint.count({ where: { customerId } }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }
}

