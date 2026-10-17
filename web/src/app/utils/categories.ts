import { Category } from '../services/categoriesService'
import {
  CATEGORY_LABELS,
  DEBT_CATEGORY_KEY,
  SYSTEM_CATEGORY_KEYS
} from '../../view/constants/CategoryConstants'

type NamedCategory = Pick<Category, 'name' | 'key'>

export interface CategoryNode {
  category: Category
  subcategories: Category[]
}

export interface CategoryOption {
  value: string
  label: string
  /** A subcategory, drawn indented below its group. */
  indent?: boolean
}

const CATALOG_ORDER = Object.keys(CATEGORY_LABELS)

/** The Portuguese name of a default or system category, the typed name of an own one. */
export function getCategoryName(category: NamedCategory) {
  return (category.key && CATEGORY_LABELS[category.key]) || category.name
}

export function isSystemCategory(category: Pick<Category, 'key'>) {
  return category.key !== null && SYSTEM_CATEGORY_KEYS.includes(category.key)
}

/** The tree holds the expense "Dívidas" group but no other system category (R8, R9). */
function isInTree(category: Category) {
  return !isSystemCategory(category) || (category.key === DEBT_CATEGORY_KEY && category.type === 'EXPENSE')
}

/** Catalog order first, then the user's own by their Portuguese name. */
export function compareCategories(a: Category, b: Category) {
  const indexA = a.key ? CATALOG_ORDER.indexOf(a.key) : -1
  const indexB = b.key ? CATALOG_ORDER.indexOf(b.key) : -1

  if (indexA >= 0 && indexB >= 0) return indexA - indexB
  if (indexA >= 0) return -1
  if (indexB >= 0) return 1
  return getCategoryName(a).localeCompare(getCategoryName(b), 'pt-BR')
}

/** The groups of a type with their subcategories, in catalog order. */
export function buildCategoryTree(categories: Category[], type: Category['type']): CategoryNode[] {
  const ofType = categories.filter(category => category.type === type && isInTree(category))

  return ofType
    .filter(category => category.parentId === null)
    .sort(compareCategories)
    .map(category => ({
      category,
      subcategories: ofType
        .filter(sub => sub.parentId === category.id)
        .sort(compareCategories)
    }))
}

/** A subcategory takes the icon and the color of its group (R12). */
export function resolveCategoryStyle(category: Category, categories: Category[]) {
  const group = category.parentId
    ? categories.find(({ id }) => id === category.parentId)
    : undefined

  return {
    icon: category.icon ?? group?.icon ?? null,
    color: group?.color ?? category.color ?? null
  }
}

/**
 * The selector options of an item: the tree of its type, groups first with
 * their subcategories indented, and no system category (R17, R18). The item's
 * current category is added when it is one of the hidden ones.
 */
export function getCategoryOptions(
  categories: Category[],
  type: Category['type'],
  currentCategoryId?: string | null
): CategoryOption[] {
  const options = buildCategoryTree(categories, type)
    .filter(({ category }) => !isSystemCategory(category))
    .flatMap(({ category, subcategories }) => [
      { value: category.id, label: getCategoryName(category) },
      ...subcategories.map(sub => ({ value: sub.id, label: getCategoryName(sub), indent: true }))
    ])

  const current = categories.find(({ id }) => id === currentCategoryId)
  if (current && !options.some(({ value }) => value === current.id)) {
    options.push({ value: current.id, label: getCategoryName(current) })
  }

  return options
}
