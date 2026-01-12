import { Module } from '@nestjs/common';
import { FeeSettlementsService } from './fee-settlements.service';
import { FeeSettlementsController } from './fee-settlements.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FeeSettlementsController],
  providers: [FeeSettlementsService],
  exports: [FeeSettlementsService],
})
export class FeeSettlementsModule {}

