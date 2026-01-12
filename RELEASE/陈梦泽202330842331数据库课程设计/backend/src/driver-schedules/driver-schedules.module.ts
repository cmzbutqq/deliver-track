import { Module } from '@nestjs/common';
import { DriverSchedulesService } from './driver-schedules.service';
import { DriverSchedulesController } from './driver-schedules.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DriverSchedulesController],
  providers: [DriverSchedulesService],
  exports: [DriverSchedulesService],
})
export class DriverSchedulesModule {}

