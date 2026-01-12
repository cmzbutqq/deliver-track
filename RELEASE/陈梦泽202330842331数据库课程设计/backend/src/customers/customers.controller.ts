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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('phone') phone?: string,
  ) {
    return this.customersService.findMany(skip, take, phone);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @Get(':id/addresses')
  getAddresses(@Param('id') id: string) {
    return this.customersService.getAddresses(id);
  }

  @Post(':id/addresses')
  addAddress(
    @Param('id') id: string,
    @Body() createAddressDto: CreateCustomerAddressDto,
  ) {
    return this.customersService.addAddress(id, createAddressDto);
  }

  @Get(':id/points')
  getPoints(@Param('id') id: string) {
    return this.customersService.getPoints(id);
  }

  @Get(':id/complaints')
  getComplaints(
    @Param('id') id: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
  ) {
    return this.customersService.getComplaints(id, skip, take);
  }
}

