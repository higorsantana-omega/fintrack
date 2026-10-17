import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { getCurrentMonth } from '../../../../app/utils/debtForm'
import { formatMonth } from '../../../../app/utils/formatMonth'

// Mirror MAX_DATE_DISTANCE_MONTHS of the API: the summary walks the months one by one.
const MAX_MONTH_DISTANCE = 120

const toMonthKey = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  return year * 12 + monthNumber - 1
}

function shiftMonth(month: string, delta: number) {
  const key = toMonthKey(month) + delta

  return `${Math.floor(key / 12)}-${String((key % 12) + 1).padStart(2, '0')}`
}

interface MonthNavigatorProps {
  month: string
  onChange(month: string): void
}

export function MonthNavigator({ month, onChange }: MonthNavigatorProps) {
  const distance = toMonthKey(month) - toMonthKey(getCurrentMonth())

  return (
    <div className='flex items-center gap-1 bg-white rounded-2xl p-1'>
      <button
        id='categories-month-prev'
        type='button'
        aria-label='Mês anterior'
        disabled={distance <= -MAX_MONTH_DISTANCE}
        onClick={() => onChange(shiftMonth(month, -1))}
        className='w-10 h-10 rounded-xl flex items-center justify-center text-gray-800 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-transparent transition-colors'
      >
        <ChevronLeftIcon className='w-5 h-5' />
      </button>

      <span id='categories-month-label' className='w-24 text-center text-sm font-medium tracking-[-0.5px] text-gray-800'>
        {formatMonth(month)}
      </span>

      <button
        id='categories-month-next'
        type='button'
        aria-label='Próximo mês'
        disabled={distance >= MAX_MONTH_DISTANCE}
        onClick={() => onChange(shiftMonth(month, 1))}
        className='w-10 h-10 rounded-xl flex items-center justify-center text-gray-800 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-transparent transition-colors'
      >
        <ChevronRightIcon className='w-5 h-5' />
      </button>
    </div>
  )
}
