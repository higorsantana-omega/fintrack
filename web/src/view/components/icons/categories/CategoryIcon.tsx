import { useCategories } from '../../../../app/hooks/useCategories'
import { Category } from '../../../../app/services/categoriesService'
import { resolveCategoryStyle } from '../../../../app/utils/categories'
import { colors } from '../../../constants/ColorsConstants'
import { fallbackIcons, iconsMap } from './iconsMap'

interface CategoryIconProps {
  type: 'income' | 'expense';
  /** The color is optional: embedded categories do not carry it, so it comes from the list. */
  category?: (Pick<Category, 'id' | 'icon' | 'parentId'> & { color?: string | null }) | null;
}

export function CategoryIcon({ type, category }: CategoryIconProps) {
  const { categories } = useCategories()
  const full = category && (categories.find(({ id }) => id === category.id) ?? { color: null, ...category } as Category)
  const style = full ? resolveCategoryStyle(full, categories) : null
  const Icon = style?.icon ? iconsMap[style.icon] : undefined

  if (!Icon) {
    const Fallback = fallbackIcons[type]
    return <Fallback />
  }

  const { color, bg } = colors.find(item => item.color === style?.color) ?? colors[0]

  return (
    <div className='size-11 shrink-0 rounded-2xl flex items-center justify-center' style={{ backgroundColor: bg, color }}>
      <Icon size={22} strokeWidth={1.75} />
    </div>
  )
}
