import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { RecipientType, NotificationType } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('recipientId') recipientId?: string,
    @Query('recipientType') recipientType?: RecipientType,
    @Query('isRead') isRead?: string,
    @Query('notificationType') notificationType?: NotificationType,
  ) {
    return this.notificationsService.findMany(
      skip,
      take,
      recipientId,
      recipientType,
      isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      notificationType,
    );
  }

  @Get('unread-count')
  getUnreadCount(
    @Query('recipientId') recipientId: string,
    @Query('recipientType') recipientType: RecipientType,
  ) {
    return this.notificationsService.getUnreadCount(recipientId, recipientType);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch(':id/unread')
  markAsUnread(@Param('id') id: string) {
    return this.notificationsService.markAsUnread(id);
  }

  @Patch('mark-all-read')
  markAllAsRead(
    @Query('recipientId') recipientId: string,
    @Query('recipientType') recipientType: RecipientType,
  ) {
    return this.notificationsService.markAllAsRead(recipientId, recipientType);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}

