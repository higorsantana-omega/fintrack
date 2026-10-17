import { useMemo, useState } from 'react'
import { useCategories } from '../../../app/hooks/useCategories'
import { useCategoriesSummary } from '../../../app/hooks/useCategoriesSummary'
import { Category } from '../../../app/services/categoriesService'
import { buildCategoryTree } from '../../../app/utils/categories'
import { getCurrentMonth } from '../../../app/utils/debtForm'

export type CategoriesTab = Category['type']

export interface CategoryRow {
  category: Category
  total: number
  subcategories: { category: Category, total: number }[]
}

/** What the page can open: the form (create or edit), the delete confirmation, or an items list. */
export type CategoriesModal =
  | { kind: 'createGroup' }
  | { kind: 'createSubcategory', parent: Category }
  | { kind: 'edit', category: Category }
  | { kind: 'delete', category: Category }
  | { kind: 'items', categoryId: string | null }

export function useCategoriesController() {
  const [month, setMonth] = useState(getCurrentMonth)
  const [tab, setTab] = useState<CategoriesTab>('EXPENSE')
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [modal, setModal] = useState<CategoriesModal | null>(null)

  const { categories, isFetching: isFetchingCategories } = useCategories()
  const { summary, isInitialLoading: isLoadingSummary } = useCategoriesSummary(month, tab)

  const rows = useMemo<CategoryRow[]>(() => {
    const totals = new Map(summary?.categories.map(row => [row.id, row.total]))
    const totalOf = (category: Category) => totals.get(category.id) ?? 0

    // The tree already is in catalog order, and the sort is stable, so equal totals keep it.
    return buildCategoryTree(categories, tab)
      .map(({ category, subcategories }) => ({
        category,
        total: totalOf(category),
        subcategories: subcategories
          .map(sub => ({ category: sub, total: totalOf(sub) }))
          .sort((a, b) => b.total - a.total)
      }))
      .sort((a, b) => b.total - a.total)
  }, [categories, summary, tab])

  const slices = useMemo(() => [
    ...rows
      .filter(row => row.total > 0)
      .map(row => ({ id: row.category.id, category: row.category, total: row.total })),
    ...(summary && summary.noCategory.total > 0
      ? [{ id: 'none', category: null, total: summary.noCategory.total }]
      : [])
  ], [rows, summary])

  const hasNoCategoryItems = !!summary?.items.some(item => item.categoryId === null)

  const items = useMemo(() => {
    if (modal?.kind !== 'items' || !summary) return []

    if (modal.categoryId === null) return summary.items.filter(item => item.categoryId === null)

    const row = rows.find(({ category }) => category.id === modal.categoryId)
    const ids = [modal.categoryId, ...(row?.subcategories.map(({ category }) => category.id) ?? [])]

    return summary.items.filter(item => item.categoryId && ids.includes(item.categoryId))
  }, [modal, summary, rows])

  function selectTab(newTab: CategoriesTab) {
    setTab(newTab)
    setModal(null)
  }

  function toggleGroup(categoryId: string) {
    setCollapsed(current => current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId])
  }

  return {
    month,
    setMonth,
    tab,
    selectTab,
    categories,
    isFetchingCategories,
    summary,
    isLoadingSummary,
    rows,
    slices,
    hasNoCategoryItems,
    items,
    collapsed,
    toggleGroup,
    modal,
    openModal: setModal,
    closeModal: () => setModal(null)
  }
}
