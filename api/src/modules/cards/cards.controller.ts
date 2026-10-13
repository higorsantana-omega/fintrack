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
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

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
}
