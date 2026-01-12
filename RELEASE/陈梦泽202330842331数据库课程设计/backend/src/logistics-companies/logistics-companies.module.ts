import { Module } from '@nestjs/common';
import { LogisticsCompaniesController } from './logistics-companies.controller';
import { LogisticsCompaniesService } from './logistics-companies.service';

@Module({
  controllers: [LogisticsCompaniesController],
  providers: [LogisticsCompaniesService],
  exports: [LogisticsCompaniesService], // 导出供其他模块使用
})
export class LogisticsCompaniesModule {}

