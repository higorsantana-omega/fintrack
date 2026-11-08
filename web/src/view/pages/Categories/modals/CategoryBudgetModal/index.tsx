import { Controller } from 'react-hook-form'
import { Category, CategoryBudget } from '../../../../../app/services/categoriesService'
import { getCategoryName } from '../../../../../app/utils/categories'
import { cn } from '../../../../../app/utils/cn'
import { formatMonth } from '../../../../../app/utils/formatMonth'
import { Button } from '../../../../components/Button'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { BudgetScope, useCategoryBudgetModalController } from './useCategoryBudgetModalController'

interface CategoryBudgetModalProps {
  category: Category
  /** The limit of the displayed month, or null when the category has none. */
  budget: CategoryBudget | null
  month: string
  onClose(): void
}

export function CategoryBudgetModal({ category, budget, month, onClose }: CategoryBudgetModalProps) {
  const { errors, control, scope, selectScope, handleSubmit, removeMonthOverride, removeBudget, isLoading } =
    useCategoryBudgetModalController(category, budget, month, onClose)

  const scopes: { value: BudgetScope, label: string }[] = [
    { value: 'ALL', label: 'Todos os meses' },
    { value: 'MONTH', label: 'Só este mês' }
  ]

  return (
    <Modal title={`Limite de ${getCategoryName(category)}`} open onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {budget && (
          <div className='mb-4'>
            <span className='text-gray-600 tracking-[-0.5px] text-xs block mb-2'>
              Valer para ({formatMonth(month)})
            </span>
            <div role='radiogroup' className='grid grid-cols-2 gap-2'>
              {scopes.map(option => (
                <button
                  key={option.value}
                  type='button'
                  role='radio'
                  aria-checked={option.value === scope}
                  onClick={() => selectScope(option.value)}
                  className={cn(
                    'h-11 rounded-lg border border-gray-500 text-sm text-gray-700',
                    option.value === scope && 'border-teal-900 bg-teal-50 text-teal-900 font-medium'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Limite mensal</span>
          <div className='flex items-center gap-1'>
            <span className='text-gray-600 tracking-[-0.5px]'>R$</span>
            <Controller
              name='amount'
              control={control}
              render={({ field: { onChange, value } }) => (
                <InputCurrency id='categoryBudgetAmount' error={errors.amount?.message} onChange={onChange} value={value} />
              )}
            />
          </div>
        </div>

        <Button id='categoryBudgetSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>

        {budget?.isAdjusted && (
          <Button
            id='categoryBudgetRemoveMonth'
            type='button'
            ghost
            className='w-full mt-2'
            disabled={isLoading}
            onClick={removeMonthOverride}
          >
            Remover ajuste do mês
          </Button>
        )}
        {budget && (
          <Button
            id='categoryBudgetRemove'
            type='button'
            danger
            className='w-full mt-2'
            disabled={isLoading}
            onClick={removeBudget}
          >
            Remover limite
          </Button>
        )}
      </form>
    </Modal>
  )
}
