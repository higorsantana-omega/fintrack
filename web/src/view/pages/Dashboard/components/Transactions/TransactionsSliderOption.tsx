import { useSwiper } from 'swiper/react'
import { cn } from '../../../../../app/utils/cn'

interface TransactionsSliderOptionProps {
  isActive: boolean
  month: string
  index: number
}

export function TransactionsSliderOption ({ isActive, month, index }: TransactionsSliderOptionProps) {
  const swiper = useSwiper()

  return (
    <button
      onClick={() => swiper.slideTo(index)}
      className={cn(
        'w-full rounded-full h-12 text-sm text-gray-800 tracking-[-0.5px] font-medium',
        isActive && 'bg-white'
      )}
      >
        {month}
    </button>
  )
}