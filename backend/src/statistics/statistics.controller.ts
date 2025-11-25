import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * 获取总览统计
   * GET /statistics/overview?date=2025-11-22
   */
  @Get('overview')
  async getOverview(@Query('date') date?: string) {
    const data = await this.statisticsService.getOverview(date);
    return { success: true, data };
  }

  /**
   * 获取配送区域统计
   * GET /statistics/zones
   */
  @Get('zones')
  async getZoneStatistics() {
    const data = await this.statisticsService.getZoneStatistics();
    return { success: true, data };
  }

  /**
   * 获取物流公司统计
   * GET /statistics/logistics
   */
  @Get('logistics')
  async getLogisticsStatistics() {
    const data = await this.statisticsService.getLogisticsStatistics();
    return { success: true, data };
  }
}

