import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

@Controller('merchants')
@UseGuards(JwtAuthGuard)
export class MerchantsController {
  constructor(private merchantsService: MerchantsService) {}

  @Get('me')
  async getProfile(@Request() req) {
    const merchant = await this.merchantsService.findOne(req.user.userId);
    return {
      success: true,
      data: merchant,
    };
  }

  @Patch('me')
  async updateProfile(@Request() req, @Body() updateDto: UpdateMerchantDto) {
    const merchant = await this.merchantsService.update(
      req.user.userId,
      updateDto,
    );
    return {
      success: true,
      data: merchant,
    };
  }
}

