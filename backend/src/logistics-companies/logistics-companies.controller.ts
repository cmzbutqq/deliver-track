import { Controller, Get } from '@nestjs/common';
import { LogisticsCompaniesService } from './logistics-companies.service';

@Controller('logistics-companies')
export class LogisticsCompaniesController {
  constructor(
    private readonly logisticsCompaniesService: LogisticsCompaniesService,
  ) {}

  /**
   * 获取所有物流公司列表
   * GET /logistics-companies
   * 公开接口，无需认证
   */
  @Get()
  async findAll() {
    const companies = await this.logisticsCompaniesService.findAll();
    return {
      success: true,
      data: companies,
    };
  }
}

