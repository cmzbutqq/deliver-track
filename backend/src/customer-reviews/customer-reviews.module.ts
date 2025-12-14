import { Module } from '@nestjs/common';
import { CustomerReviewsController } from './customer-reviews.controller';
import { CustomerReviewsService } from './customer-reviews.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerReviewsController],
  providers: [CustomerReviewsService],
  exports: [CustomerReviewsService],
})
export class CustomerReviewsModule {}

