import { z } from 'zod'
import { Category } from '../services/categoriesService'
import { getCategoryName } from './categories'

const normalize = (name: string) => name.trim().toLowerCase()

/**
 * The names a new or renamed category cannot take: its siblings', as shown to
 * the user. The API only knows the stored (English) names of the default
 * ones, so it cannot see a clash with a translated name (KTD12).
 */
export function getSiblingNames(
  categories: Category[],
  { type, parentId, excludeId }: { type: Category['type'], parentId: string | null, excludeId?: string }
) {
  return categories
    .filter(category => category.type === type && category.parentId === parentId && category.id !== excludeId)
    .map(category => normalize(getCategoryName(category)))
}

/** A group also needs an icon and a color; a subcategory only a name. */
export function getCategoryFormSchema(siblingNames: string[], isGroup: boolean) {
  return z.object({
    name: z.string()
      .trim()
      .nonempty('Informe o nome da categoria')
      .max(60, 'Use até 60 caracteres')
      .refine(name => !siblingNames.includes(normalize(name)), 'Já existe uma categoria com esse nome'),
    icon: isGroup ? z.string().nonempty('Escolha um ícone') : z.string().optional(),
    color: isGroup ? z.string().nonempty('Escolha uma cor') : z.string().optional()
  })
}

export type CategoryFormData = z.infer<ReturnType<typeof getCategoryFormSchema>>
