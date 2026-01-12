import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AmapService } from './services/amap.service';
import { RouteQueueService } from './services/route-queue.service';
import { MultiRoutePlannerService } from './services/multi-route-planner.service';
import { LogisticsCompaniesModule } from '../logistics-companies/logistics-companies.module';
import { TrackingModule } from '../tracking/tracking.module';
import { SimulatorModule } from '../simulator/simulator.module';

@Module({
  imports: [
    LogisticsCompaniesModule,
    forwardRef(() => TrackingModule),
    forwardRef(() => SimulatorModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, AmapService, RouteQueueService, MultiRoutePlannerService],
  exports: [OrdersService, RouteQueueService],
})
export class OrdersModule {}

