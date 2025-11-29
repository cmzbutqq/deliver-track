import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
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
  async getOverview(@Request() req, @Query('date') date?: string) {
    const data = await this.statisticsService.getOverview(req.user.userId, date);
    return { success: true, data };
  }

  /**
   * 获取配送区域统计
   * GET /statistics/zones
   */
  @Get('zones')
  async getZoneStatistics(@Request() req) {
    const data = await this.statisticsService.getZoneStatistics(req.user.userId);
    return { success: true, data };
  }

  /**
   * 获取物流公司统计
   * GET /statistics/logistics
   */
  @Get('logistics')
  async getLogisticsStatistics(@Request() req) {
    const data = await this.statisticsService.getLogisticsStatistics(req.user.userId);
    return { success: true, data };
  }
}

