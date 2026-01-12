import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { WarehouseTransactionsService } from './warehouse-transactions.service';
import { CreateWarehouseTransactionDto } from './dto/create-warehouse-transaction.dto';

@Controller('warehouse-transactions')
export class WarehouseTransactionsController {
  constructor(private readonly warehouseTransactionsService: WarehouseTransactionsService) {}

  @Post()
  create(@Body() createWarehouseTransactionDto: CreateWarehouseTransactionDto) {
    return this.warehouseTransactionsService.create(createWarehouseTransactionDto);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('warehouseId') warehouseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.warehouseTransactionsService.findMany(skip, take, warehouseId, startDate, endDate);
  }

  @Get('statistics')
  getStatistics(
    @Query('warehouseId') warehouseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.warehouseTransactionsService.getStatistics(warehouseId, startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warehouseTransactionsService.findOne(id);
  }
}

