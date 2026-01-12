import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { RefundStatus } from '@prisma/client';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  create(@Body() createRefundDto: CreateRefundDto) {
    return this.refundsService.create(createRefundDto);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('orderId') orderId?: string,
    @Query('status') status?: RefundStatus,
  ) {
    return this.refundsService.findMany(skip, take, orderId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.refundsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRefundDto: UpdateRefundDto) {
    return this.refundsService.update(id, updateRefundDto);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.refundsService.approve(id);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.refundsService.reject(id);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.refundsService.complete(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.refundsService.remove(id);
  }
}

