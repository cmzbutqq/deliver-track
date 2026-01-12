import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FeeSettlementsService } from './fee-settlements.service';
import { CreateFeeSettlementDto } from './dto/create-fee-settlement.dto';

@Controller('fee-settlements')
export class FeeSettlementsController {
  constructor(private readonly feeSettlementsService: FeeSettlementsService) {}

  @Post()
  create(@Body() createFeeSettlementDto: CreateFeeSettlementDto) {
    return this.feeSettlementsService.create(createFeeSettlementDto);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('merchantId') merchantId?: string,
  ) {
    return this.feeSettlementsService.findMany(skip, take, merchantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.feeSettlementsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.feeSettlementsService.updateStatus(id, status);
  }

  @Get(':id/details')
  getDetails(@Param('id') id: string) {
    return this.feeSettlementsService.getDetails(id);
  }
}

