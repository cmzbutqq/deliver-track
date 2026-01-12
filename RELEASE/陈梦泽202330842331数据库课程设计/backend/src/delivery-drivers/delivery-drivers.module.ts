import { Module } from '@nestjs/common';
import { DeliveryDriversController } from './delivery-drivers.controller';
import { DeliveryDriversService } from './delivery-drivers.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryDriversController],
  providers: [DeliveryDriversService],
  exports: [DeliveryDriversService],
})
export class DeliveryDriversModule {}

