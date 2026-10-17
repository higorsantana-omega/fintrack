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
  Query,
} from '@nestjs/common';
import { ParseMonthPipe } from 'src/pipes/ParseMonthPipe';
import ActiveUserId from 'src/decorators/activeUserId.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { DeleteCategoryDto } from './dto/delete-category.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@ActiveUserId() userId: string) {
    return this.categoriesService.findAllByUserId(userId);
  }

  // Declared before `:categoryId`, so "summary" is never read as an id.
  @Get('summary/:month')
  getSummary(
    @ActiveUserId() userId: string,
    @Param('month', ParseMonthPipe) month: string,
    @Query() { type }: SummaryQueryDto,
  ) {
    return this.categoriesService.getSummary(userId, month, type);
  }

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(userId, createCategoryDto);
  }

  @Put(':categoryId')
  update(
    @ActiveUserId() userId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(userId, categoryId, updateCategoryDto);
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @ActiveUserId() userId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() deleteCategoryDto: DeleteCategoryDto,
  ) {
    return this.categoriesService.remove(userId, categoryId, deleteCategoryDto);
  }
}
