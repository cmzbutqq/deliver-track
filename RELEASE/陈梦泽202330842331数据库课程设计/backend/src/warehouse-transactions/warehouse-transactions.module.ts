import { Module } from '@nestjs/common';
import { WarehouseTransactionsService } from './warehouse-transactions.service';
import { WarehouseTransactionsController } from './warehouse-transactions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseTransactionsController],
  providers: [WarehouseTransactionsService],
  exports: [WarehouseTransactionsService],
})
export class WarehouseTransactionsModule {}

