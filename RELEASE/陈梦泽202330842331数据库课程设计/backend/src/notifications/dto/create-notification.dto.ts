import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { RecipientType, NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @IsString()
  recipientId: string;

  @IsEnum(RecipientType)
  recipientType: RecipientType;

  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}

