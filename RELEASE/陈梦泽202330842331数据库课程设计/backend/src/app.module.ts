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
import { DeliveryDriversModule } from './delivery-drivers/delivery-drivers.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { CustomerReviewsModule } from './customer-reviews/customer-reviews.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { FeeSettlementsModule } from './fee-settlements/fee-settlements.module';
import { DriverSchedulesModule } from './driver-schedules/driver-schedules.module';
import { VehicleMaintenancesModule } from './vehicle-maintenances/vehicle-maintenances.module';
import { WarehouseTransactionsModule } from './warehouse-transactions/warehouse-transactions.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { PaymentsModule } from './payments/payments.module';
import { RefundsModule } from './refunds/refunds.module';
import { CouponsModule } from './coupons/coupons.module';
import { NotificationsModule } from './notifications/notifications.module';

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
    DeliveryDriversModule,
    WarehousesModule,
    VehiclesModule,
    CustomerReviewsModule,
    CustomersModule,
    ProductsModule,
    FeeSettlementsModule,
    DriverSchedulesModule,
    VehicleMaintenancesModule,
    WarehouseTransactionsModule,
    OrderItemsModule,
    PaymentsModule,
    RefundsModule,
    CouponsModule,
    NotificationsModule,
  ],
})
export class AppModule {}

