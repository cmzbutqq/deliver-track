import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { RecipientType, NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        ...dto,
        isRead: dto.isRead ?? false,
      },
    });
  }

  async findMany(
    skip = 0,
    take = 20,
    recipientId?: string,
    recipientType?: RecipientType,
    isRead?: boolean,
    notificationType?: NotificationType,
  ) {
    const where: any = {};
    if (recipientId) {
      where.recipientId = recipientId;
    }
    if (recipientType) {
      where.recipientType = recipientType;
    }
    if (isRead !== undefined) {
      where.isRead = isRead;
    }
    if (notificationType) {
      where.notificationType = notificationType;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`通知 ${id} 不存在`);
    }

    return notification;
  }

  async update(id: string, dto: UpdateNotificationDto) {
    const data: any = { ...dto };
    
    // 如果标记为已读，更新阅读时间
    if (dto.isRead === true) {
      data.readAt = new Date();
    } else if (dto.isRead === false) {
      data.readAt = null;
    }

    return this.prisma.notification.update({
      where: { id },
      data,
    });
  }

  async markAsRead(id: string) {
    return this.update(id, { isRead: true });
  }

  async markAsUnread(id: string) {
    return this.update(id, { isRead: false });
  }

  async markAllAsRead(recipientId: string, recipientType: RecipientType) {
    return this.prisma.notification.updateMany({
      where: {
        recipientId,
        recipientType,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async getUnreadCount(recipientId: string, recipientType: RecipientType) {
    return this.prisma.notification.count({
      where: {
        recipientId,
        recipientType,
        isRead: false,
      },
    });
  }
}

