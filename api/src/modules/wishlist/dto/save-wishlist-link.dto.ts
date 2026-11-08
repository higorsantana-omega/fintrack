import { IsNotEmpty, IsString, IsUrl, Matches } from 'class-validator';

export class SaveWishlistLinkDto {
  /** Only http and https addresses (KTD12). */
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  storeName: string;
}
