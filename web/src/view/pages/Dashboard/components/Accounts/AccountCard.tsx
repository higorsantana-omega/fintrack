import { BankAccount } from '../../../../../app/entities/BankAccount'
import { cn } from '../../../../../app/utils/cn'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'
import { CategoryIcon } from '../../../../components/icons/categories/CategoryIcon'
import { useDashboard } from '../DashboardContext/useDashboard'

interface AccountCardProps {
  data: BankAccount
}

export function AccountCard ({ data }: AccountCardProps) {
  const { color, name, currentBalance, type } = data
  const { areValuesVisible, toggleOpenEditAccountModal } = useDashboard()

  return (
    <div
      className='p-4 bg-white rounded-2xl h-[200px] flex flex-col justify-between border-b-4 border-teal-950'
      style={{ borderColor: color }}
      role='button'
      onClick={() => toggleOpenEditAccountModal(data)}
    >
      <div>
        <CategoryIcon type='income'/>
        <span className='text-gray-800 font-medium tracking-[-0.5px] mt-4 block'>
          {name}
        </span>
      </div>

      <div>
        <span
          className={cn(
            'text-gray-800 font-medium tracking-[-0.5px] mt-4 block',
            !areValuesVisible && 'blur-[8px]'
          )}
        >
          {formatCurrency(currentBalance)}
        </span>
        <small className='text-gray-600 text-sm'>Saldo atual</small>
      </div>
    </div>
  )
}
