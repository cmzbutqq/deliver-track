import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MerchantsModule } from './merchants/merchants.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';
import { TrackingModule } from './tracking/tracking.module';
import { SimulatorModule } from './simulator/simulator.module';
import { LogisticsCompaniesModule } from './logistics-companies/logistics-companies.module';
import { StatisticsModule } from './statistics/statistics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    MerchantsModule,
    OrdersModule,
    DeliveryZonesModule,
    TrackingModule,
    SimulatorModule,
    LogisticsCompaniesModule,
    StatisticsModule,
  ],
})
export class AppModule {}

