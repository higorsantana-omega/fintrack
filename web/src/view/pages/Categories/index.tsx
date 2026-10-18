import { Transition } from '@headlessui/react'
import { PlusIcon } from '@radix-ui/react-icons'
import { cn } from '../../../app/utils/cn'
import { Button } from '../../components/Button'
import { CategoriesDonut } from './components/CategoriesDonut'
import { CategoriesSkeleton } from './components/CategoriesSkeleton'
import { CategoryTree } from './components/CategoryTree'
import { MonthNavigator } from './components/MonthNavigator'
import { CategoryFormModal } from './modals/CategoryFormModal'
import { CategoryItemsModal } from './modals/CategoryItemsModal'
import { DeleteCategoryModal } from './modals/DeleteCategoryModal'
import { CategoriesTab, useCategoriesController } from './useCategoriesController'

const TABS: { tab: CategoriesTab, id: string, label: string }[] = [
  { tab: 'EXPENSE', id: 'categories-tab-expense', label: 'Despesas' },
  { tab: 'INCOME', id: 'categories-tab-income', label: 'Receitas' }
]

export function Categories() {
  const {
    month,
    setMonth,
    tab,
    selectTab,
    categories,
    summary,
    isLoadingSummary,
    rows,
    slices,
    hasNoCategoryItems,
    items,
    collapsed,
    toggleGroup,
    modal,
    openModal,
    closeModal
  } = useCategoriesController()

  const itemsCategory = modal?.kind === 'items'
    ? categories.find(({ id }) => id === modal.categoryId) ?? null
    : null

  return (
    <main className='flex-1 flex flex-col gap-4'>
      <section className='flex-1 bg-gray-100 rounded-2xl p-4 md:p-8 flex flex-col gap-6'>
        <header className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div role='tablist' className='flex gap-1'>
            {TABS.map(item => (
              <button
                key={item.tab}
                id={item.id}
                type='button'
                role='tab'
                aria-selected={item.tab === tab}
                onClick={() => selectTab(item.tab)}
                className={cn(
                  'h-9 px-3 rounded-full text-sm font-medium tracking-[-0.5px] whitespace-nowrap transition-colors text-gray-700 hover:bg-gray-200',
                  item.tab === tab && 'bg-teal-900 text-white hover:bg-teal-900'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <MonthNavigator month={month} onChange={setMonth} />
            <Button id='categories-new-group' className='h-10 gap-2 px-4 whitespace-nowrap' onClick={() => openModal({ kind: 'createGroup' })}>
              <PlusIcon className='w-4 h-4' />
              Nova categoria
            </Button>
          </div>
        </header>

        {(isLoadingSummary || !summary) && <CategoriesSkeleton groups={rows.length} />}

        {!isLoadingSummary && summary && (
          <Transition
            appear
            show
            enter='transition-opacity duration-200'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            className='grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6 items-start'
          >
            <CategoriesDonut slices={slices} net={summary.net} />

            <div className='space-y-4 min-w-0'>
              <CategoryTree
                tab={tab}
                rows={rows}
                collapsed={collapsed}
                noCategoryTotal={hasNoCategoryItems ? summary.noCategory.total : null}
                onToggle={toggleGroup}
                onOpenItems={categoryId => openModal({ kind: 'items', categoryId })}
                onCreateSubcategory={parent => openModal({ kind: 'createSubcategory', parent })}
                onEdit={category => openModal({ kind: 'edit', category })}
                onDelete={category => openModal({ kind: 'delete', category })}
              />

              <p id='categories-notice' className='text-xs text-gray-600'>
                Não entram nos totais: pagamento de fatura de cartão, aportes em metas, empréstimos a pessoas e o dinheiro recebido de dívidas. Compras de cartão contam no mês da fatura, com as previsões das cobranças recorrentes.
              </p>
            </div>
          </Transition>
        )}
      </section>

      {modal?.kind === 'items' && (
        <CategoryItemsModal
          open
          category={itemsCategory}
          categories={categories}
          items={items}
          onClose={closeModal}
        />
      )}
      {modal?.kind === 'createGroup' && (
        <CategoryFormModal target={{ kind: 'createGroup', type: tab }} categories={categories} onClose={closeModal} />
      )}
      {modal?.kind === 'createSubcategory' && (
        <CategoryFormModal target={modal} categories={categories} onClose={closeModal} />
      )}
      {modal?.kind === 'edit' && (
        <CategoryFormModal target={modal} categories={categories} onClose={closeModal} />
      )}
      {modal?.kind === 'delete' && (
        <DeleteCategoryModal category={modal.category} categories={categories} onClose={closeModal} />
      )}
    </main>
  )
}
