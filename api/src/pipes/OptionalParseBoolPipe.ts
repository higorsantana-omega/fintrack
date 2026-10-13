import { ArgumentMetadata, ParseBoolPipe } from '@nestjs/common';

export class OptionalParseBoolPipe extends ParseBoolPipe {
  override async transform(
    value: string | boolean,
    metadata: ArgumentMetadata,
  ): Promise<boolean> {
    if (value === undefined) return false;

    return super.transform(value, metadata);
  }
}
