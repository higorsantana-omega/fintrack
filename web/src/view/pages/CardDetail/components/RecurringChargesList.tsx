import { RecurringCharge } from '../../../../app/entities/CreditCard'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { getCategoryName } from '../../../../app/utils/categories'
import { CategoryIcon } from '../../../components/icons/categories/CategoryIcon'

interface RecurringChargesListProps {
  recurringCharges: RecurringCharge[]
  canEdit: boolean
  onEdit(recurringCharge: RecurringCharge): void
  onCancel(recurringCharge: RecurringCharge): void
}

export function RecurringChargesList({ recurringCharges, canEdit, onEdit, onCancel }: RecurringChargesListProps) {
  return (
    <div id='recurring-charges' className='bg-gray-100 rounded-2xl p-6 md:p-8 flex flex-col gap-4'>
      <strong className='text-gray-800 tracking-[-1px] text-lg'>Recorrentes</strong>

      {recurringCharges.length === 0 && (
        <p className='text-gray-600 text-sm py-6 text-center'>Nenhuma recorrente ativa.</p>
      )}

      {recurringCharges.length > 0 && (
        <ul className='space-y-2'>
          {recurringCharges.map(recurringCharge => (
            <li key={recurringCharge.id} className='recurring-charge bg-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <CategoryIcon type='expense' category={recurringCharge.category} />
                <div>
                  <strong className='font-bold tracking-[-0.5px] block text-gray-800'>{recurringCharge.description}</strong>
                  <span className='text-sm text-gray-600'>
                    {formatCurrency(recurringCharge.value)} todo dia {new Date(recurringCharge.firstChargeDate).getUTCDate()}
                    {recurringCharge.category && ` · ${getCategoryName(recurringCharge.category)}`}
                  </span>
                </div>
              </div>

              {canEdit && (
                <div className='flex gap-2'>
                  <button
                    type='button'
                    className='text-sm font-medium text-teal-900 hover:underline'
                    onClick={() => onEdit(recurringCharge)}
                  >
                    Editar
                  </button>
                  <button
                    type='button'
                    className='text-sm font-medium text-red-900 hover:underline'
                    onClick={() => onCancel(recurringCharge)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
