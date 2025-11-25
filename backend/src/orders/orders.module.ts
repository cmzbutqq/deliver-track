import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AmapService } from './services/amap.service';
import { LogisticsCompaniesModule } from '../logistics-companies/logistics-companies.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    LogisticsCompaniesModule,
    forwardRef(() => TrackingModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, AmapService],
  exports: [OrdersService],
})
export class OrdersModule {}

