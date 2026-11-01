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
import { CreateWishlistPriceDto } from './dto/create-wishlist-price.dto';
import { PostponeWishlistItemDto } from './dto/postpone-wishlist-item.dto';
import { PurchaseWishlistItemDto } from './dto/purchase-wishlist-item.dto';
import { SaveWishlistItemDto } from './dto/save-wishlist-item.dto';
import { SaveWishlistLinkDto } from './dto/save-wishlist-link.dto';
import { SaveWishlistListDto } from './dto/save-wishlist-list.dto';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  // Lists ----------------------------------------------------------------

  @Get('lists')
  findLists(@ActiveUserId() userId: string) {
    return this.wishlistService.findLists(userId);
  }

  @Post('lists')
  createList(
    @ActiveUserId() userId: string,
    @Body() saveWishlistListDto: SaveWishlistListDto,
  ) {
    return this.wishlistService.createList(userId, saveWishlistListDto);
  }

  @Put('lists/:listId')
  updateList(
    @ActiveUserId() userId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() saveWishlistListDto: SaveWishlistListDto,
  ) {
    return this.wishlistService.updateList(userId, listId, saveWishlistListDto);
  }

  @Delete('lists/:listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeList(
    @ActiveUserId() userId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
  ) {
    return this.wishlistService.removeList(userId, listId);
  }

  // Items ----------------------------------------------------------------

  @Get('items')
  findItems(@ActiveUserId() userId: string) {
    return this.wishlistService.findItems(userId);
  }

  @Post('items')
  createItem(
    @ActiveUserId() userId: string,
    @Body() saveWishlistItemDto: SaveWishlistItemDto,
  ) {
    return this.wishlistService.createItem(userId, saveWishlistItemDto);
  }

  @Put('items/:itemId')
  updateItem(
    @ActiveUserId() userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() saveWishlistItemDto: SaveWishlistItemDto,
  ) {
    return this.wishlistService.updateItem(userId, itemId, saveWishlistItemDto);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @ActiveUserId() userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.wishlistService.removeItem(userId, itemId);
  }

  // Reminders and item actions --------------------------------------------

  @Get('reminders')
  findReminders(@ActiveUserId() userId: string) {
    return this.wishlistService.findReminders(userId);
  }

  @Post('items/:itemId/purchase')
  purchase(
    @ActiveUserId() userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() purchaseWishlistItemDto: PurchaseWishlistItemDto,
  ) {
    return this.wishlistService.purchase(
      userId,
      itemId,
      purchaseWishlistItemDto,
    );
  }

  @Post('items/:itemId/give-up')
  giveUp(
    @ActiveUserId() userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.wishlistService.giveUp(userId, itemId);
  }

  @Post('items/:itemId/reactivate')
  reactivate(
    @ActiveUserId() userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.wishlistService.reactivate(userId, itemId);
  }

  @Post('items/:itemId/keep')
  keep(
    @ActiveUserId() userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.wishlistService.keep(userId, itemId);
  }

  @Post('items/:itemId/postpone')
  postpone(
    @ActiveUserId() userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() postponeWishlistItemDto: PostponeWishlistItemDto,
  ) {
    return this.wishlistService.postpone(
      userId,
      itemId,
      postponeWishlistItemDto,
    );
  }

  // Links and prices -----------------------------------------------------

  @Post('items/:itemId/links')
  createLink(
    @ActiveUserId() userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() saveWishlistLinkDto: SaveWishlistLinkDto,
  ) {
    return this.wishlistService.createLink(userId, itemId, saveWishlistLinkDto);
  }

  @Put('links/:linkId')
  updateLink(
    @ActiveUserId() userId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() saveWishlistLinkDto: SaveWishlistLinkDto,
  ) {
    return this.wishlistService.updateLink(userId, linkId, saveWishlistLinkDto);
  }

  @Delete('links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLink(
    @ActiveUserId() userId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ) {
    return this.wishlistService.removeLink(userId, linkId);
  }

  @Post('links/:linkId/prices')
  createPrice(
    @ActiveUserId() userId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() createWishlistPriceDto: CreateWishlistPriceDto,
  ) {
    return this.wishlistService.createPrice(
      userId,
      linkId,
      createWishlistPriceDto,
    );
  }

  @Delete('prices/:priceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePrice(
    @ActiveUserId() userId: string,
    @Param('priceId', ParseUUIDPipe) priceId: string,
  ) {
    return this.wishlistService.removePrice(userId, priceId);
  }
}
