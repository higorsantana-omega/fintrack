import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from 'src/database/repositories/categories.repositories';

@Injectable()
export class ValidateCategoryOwnershipService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async validate(userId: string, categoryId: string) {
    const category = await this.categoriesRepository.findFirst(
      userId,
      categoryId,
    );

    if (!category) throw new NotFoundException('Category not found.');

    return category;
  }
}
