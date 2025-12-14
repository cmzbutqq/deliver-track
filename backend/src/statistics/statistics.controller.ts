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

  /**
   * 获取配送员绩效统计
   * GET /statistics/drivers?driverId=xxx
   */
  @Get('drivers')
  async getDriverPerformance(@Query('driverId') driverId?: string) {
    const data = await this.statisticsService.getDriverPerformance(driverId);
    return { success: true, data };
  }

  /**
   * 获取仓库运营统计
   * GET /statistics/warehouses?warehouseId=xxx
   */
  @Get('warehouses')
  async getWarehouseStatistics(@Query('warehouseId') warehouseId?: string) {
    const data = await this.statisticsService.getWarehouseStatistics(warehouseId);
    return { success: true, data };
  }

  /**
   * 获取异常订单分析
   * GET /statistics/exceptions?merchantId=xxx
   */
  @Get('exceptions')
  async getExceptionAnalysis(@Request() req, @Query('merchantId') merchantId?: string) {
    const data = await this.statisticsService.getExceptionAnalysis(
      merchantId || req.user.userId,
    );
    return { success: true, data };
  }

  /**
   * 获取费用统计分析
   * GET /statistics/fees?merchantId=xxx&startDate=xxx&endDate=xxx
   */
  @Get('fees')
  async getFeeStatistics(
    @Request() req,
    @Query('merchantId') merchantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.statisticsService.getFeeStatistics(
      merchantId || req.user.userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return { success: true, data };
  }
}

