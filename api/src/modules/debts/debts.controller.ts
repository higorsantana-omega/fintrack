import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import ActiveUserId from 'src/decorators/activeUserId.decorator';
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { UpdateExpectedValueDto } from './dto/update-expected-value.dto';

@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  create(@ActiveUserId() userId: string, @Body() createDebtDto: CreateDebtDto) {
    return this.debtsService.create(userId, createDebtDto);
  }

  @Get()
  findAll(@ActiveUserId() userId: string) {
    return this.debtsService.findAllByUserId(userId);
  }

  @Get('reminders')
  findReminders(@ActiveUserId() userId: string) {
    return this.debtsService.findReminders(userId);
  }

  @Get(':debtId')
  findOne(
    @ActiveUserId() userId: string,
    @Param('debtId', ParseUUIDPipe) debtId: string,
  ) {
    return this.debtsService.findOne(userId, debtId);
  }

  @Post(':debtId/payments')
  pay(
    @ActiveUserId() userId: string,
    @Param('debtId', ParseUUIDPipe) debtId: string,
    @Body() createDebtPaymentDto: CreateDebtPaymentDto,
  ) {
    return this.debtsService.pay(userId, debtId, createDebtPaymentDto);
  }

  @Put(':debtId')
  update(
    @ActiveUserId() userId: string,
    @Param('debtId', ParseUUIDPipe) debtId: string,
    @Body() updateDebtDto: UpdateDebtDto,
  ) {
    return this.debtsService.update(userId, debtId, updateDebtDto);
  }

  @Put(':debtId/expected-value')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateExpectedValue(
    @ActiveUserId() userId: string,
    @Param('debtId', ParseUUIDPipe) debtId: string,
    @Body() updateExpectedValueDto: UpdateExpectedValueDto,
  ) {
    return this.debtsService.updateExpectedValue(
      userId,
      debtId,
      updateExpectedValueDto,
    );
  }

  @Delete(':debtId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @ActiveUserId() userId: string,
    @Param('debtId', ParseUUIDPipe) debtId: string,
  ) {
    return this.debtsService.remove(userId, debtId);
  }
}
