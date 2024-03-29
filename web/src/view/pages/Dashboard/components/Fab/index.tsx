import { PlusIcon } from '@radix-ui/react-icons'
import { DropdownMenu } from '../../../../components/DropdownMenu'
import { Expense } from '../../../../components/icons/categories/expense/Expense'
import { Income } from '../../../../components/icons/categories/income/Income'
import { BankAccountIcon } from '../../../../components/icons/BankAccount'
import { useDashboard } from '../DashboardContext/useDashboard'

export function Fab() {
  const { toggleCloseNewAccountModal, toggleOpenTransactionModal } = useDashboard()

  return (
    <div className='fixed right-4 bottom-4'>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button className='bg-teal-900 rounded-full w-12 h-12 flex items-center justify-center text-white'>
            <PlusIcon className='w-6 h-6' />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => toggleOpenTransactionModal('EXPENSE')}>
            <Expense />
            Nova despesa
          </DropdownMenu.Item>

          <DropdownMenu.Item onSelect={() => toggleOpenTransactionModal('INCOME')}>
            <Income />
            Nova receita
          </DropdownMenu.Item>

          <DropdownMenu.Item onSelect={toggleCloseNewAccountModal}>
            <BankAccountIcon />
            Nova conta
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  )
}