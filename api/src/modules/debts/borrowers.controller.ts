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
import { BorrowersService } from './borrowers.service';
import { CreateBorrowerDto } from './dto/create-borrower.dto';
import { CreateBorrowerMovementDto } from './dto/create-borrower-movement.dto';
import { UpdateBorrowerDto } from './dto/update-borrower.dto';

@Controller('borrowers')
export class BorrowersController {
  constructor(private readonly borrowersService: BorrowersService) {}

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Body() createBorrowerDto: CreateBorrowerDto,
  ) {
    return this.borrowersService.create(userId, createBorrowerDto);
  }

  @Get()
  findAll(@ActiveUserId() userId: string) {
    return this.borrowersService.findAllByUserId(userId);
  }

  @Get(':borrowerId')
  findOne(
    @ActiveUserId() userId: string,
    @Param('borrowerId', ParseUUIDPipe) borrowerId: string,
  ) {
    return this.borrowersService.findOne(userId, borrowerId);
  }

  @Post(':borrowerId/movements')
  createMovement(
    @ActiveUserId() userId: string,
    @Param('borrowerId', ParseUUIDPipe) borrowerId: string,
    @Body() createBorrowerMovementDto: CreateBorrowerMovementDto,
  ) {
    return this.borrowersService.createMovement(
      userId,
      borrowerId,
      createBorrowerMovementDto,
    );
  }

  @Put(':borrowerId')
  update(
    @ActiveUserId() userId: string,
    @Param('borrowerId', ParseUUIDPipe) borrowerId: string,
    @Body() updateBorrowerDto: UpdateBorrowerDto,
  ) {
    return this.borrowersService.update(userId, borrowerId, updateBorrowerDto);
  }

  @Delete(':borrowerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @ActiveUserId() userId: string,
    @Param('borrowerId', ParseUUIDPipe) borrowerId: string,
  ) {
    return this.borrowersService.remove(userId, borrowerId);
  }
}
