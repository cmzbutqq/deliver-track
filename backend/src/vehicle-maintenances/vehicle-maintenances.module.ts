import { Module } from '@nestjs/common';
import { VehicleMaintenancesService } from './vehicle-maintenances.service';
import { VehicleMaintenancesController } from './vehicle-maintenances.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VehicleMaintenancesController],
  providers: [VehicleMaintenancesService],
  exports: [VehicleMaintenancesService],
})
export class VehicleMaintenancesModule {}

