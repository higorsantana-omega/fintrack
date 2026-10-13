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
import { ParseMonthPipe } from 'src/pipes/ParseMonthPipe';
import { CardsService } from './cards.service';
import { CardEntriesService } from './card-entries.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CreateCardPurchaseDto } from './dto/create-card-purchase.dto';
import { UpdateCardPurchaseDto } from './dto/update-card-purchase.dto';
import { CreateRecurringChargeDto } from './dto/create-recurring-charge.dto';
import { UpdateRecurringChargeDto } from './dto/update-recurring-charge.dto';
import { CreateInvoicePaymentDto } from './dto/create-invoice-payment.dto';

@Controller('cards')
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly cardEntriesService: CardEntriesService,
  ) {}

  @Post()
  create(@ActiveUserId() userId: string, @Body() createCardDto: CreateCardDto) {
    return this.cardsService.create(userId, createCardDto);
  }

  @Get()
  findAll(@ActiveUserId() userId: string) {
    return this.cardsService.findAllByUserId(userId);
  }

  @Get('summary')
  getSummary(@ActiveUserId() userId: string) {
    return this.cardsService.getSummary(userId);
  }

  @Get('reminders')
  findReminders(@ActiveUserId() userId: string) {
    return this.cardsService.findReminders(userId);
  }

  @Get(':cardId')
  findOne(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.cardsService.findOne(userId, cardId);
  }

  @Put(':cardId')
  update(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() updateCardDto: UpdateCardDto,
  ) {
    return this.cardsService.update(userId, cardId, updateCardDto);
  }

  @Delete(':cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.cardsService.remove(userId, cardId);
  }

  @Post(':cardId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.cardsService.archive(userId, cardId);
  }

  @Post(':cardId/invoices/:month/payments')
  payInvoice(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Param('month', ParseMonthPipe) month: string,
    @Body() createInvoicePaymentDto: CreateInvoicePaymentDto,
  ) {
    return this.cardsService.payInvoice(
      userId,
      cardId,
      month,
      createInvoicePaymentDto,
    );
  }

  @Post(':cardId/purchases')
  createPurchase(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() createCardPurchaseDto: CreateCardPurchaseDto,
  ) {
    return this.cardEntriesService.createPurchase(
      userId,
      cardId,
      createCardPurchaseDto,
    );
  }

  @Put(':cardId/purchases/:purchaseId')
  updatePurchase(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
    @Body() updateCardPurchaseDto: UpdateCardPurchaseDto,
  ) {
    return this.cardEntriesService.updatePurchase(
      userId,
      cardId,
      purchaseId,
      updateCardPurchaseDto,
    );
  }

  @Delete(':cardId/purchases/:purchaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePurchase(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
  ) {
    return this.cardEntriesService.removePurchase(userId, cardId, purchaseId);
  }

  @Post(':cardId/recurring-charges')
  createRecurringCharge(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() createRecurringChargeDto: CreateRecurringChargeDto,
  ) {
    return this.cardEntriesService.createRecurringCharge(
      userId,
      cardId,
      createRecurringChargeDto,
    );
  }

  @Put(':cardId/recurring-charges/:recurringChargeId')
  updateRecurringCharge(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Param('recurringChargeId', ParseUUIDPipe) recurringChargeId: string,
    @Body() updateRecurringChargeDto: UpdateRecurringChargeDto,
  ) {
    return this.cardEntriesService.updateRecurringCharge(
      userId,
      cardId,
      recurringChargeId,
      updateRecurringChargeDto,
    );
  }

  @Post(':cardId/recurring-charges/:recurringChargeId/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelRecurringCharge(
    @ActiveUserId() userId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Param('recurringChargeId', ParseUUIDPipe) recurringChargeId: string,
  ) {
    return this.cardEntriesService.cancelRecurringCharge(
      userId,
      cardId,
      recurringChargeId,
    );
  }
}
