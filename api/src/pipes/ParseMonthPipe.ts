import { BadRequestException, PipeTransform } from '@nestjs/common';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class ParseMonthPipe implements PipeTransform<string, string> {
  transform(value: string) {
    if (!MONTH_PATTERN.test(value)) {
      throw new BadRequestException(
        'Validation failed (month must be in the YYYY-MM format)',
      );
    }

    return value;
  }
}
