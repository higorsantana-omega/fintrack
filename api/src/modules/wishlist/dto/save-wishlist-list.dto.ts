import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SaveWishlistListDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  name: string;
}
