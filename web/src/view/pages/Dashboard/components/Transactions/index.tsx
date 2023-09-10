import { ChevronDownIcon } from '@radix-ui/react-icons'
import { TransactionsIcon } from '../../../../components/icons/TransactionsIcon'
import { FilterIcon } from '../../../../components/icons/FilterIcon'
import { Swiper, SwiperSlide } from 'swiper/react'
import { MONTHS } from '../../../../../app/config/constants'
import { TransactionsSliderOption } from './TransactionsSliderOption'
import { TransactionsSliderNavigation } from './TransactionsSliderNavigation'

export function Transactions() {
  return (
    <div className='bg-gray-100 rounded-2xl w-full h-full md:p-10 px-4 py-8'>
      <header className=''>
        <div className='flex items-center justify-between'>
          <button className='flex items-center gap-2'>
            <TransactionsIcon />
            <span className='text-sm text-gray-800 tracking-[-0.5px] font-medium'>Transacoes</span>
            <ChevronDownIcon className='text-gray-900'/>
          </button>

          <button>
            <FilterIcon />
          </button>
        </div>

        <div className='mt-6 relative'>
          <Swiper
            slidesPerView={3}
            centeredSlides
          >
            <TransactionsSliderNavigation />

            {MONTHS.map((month, index) => (
              <SwiperSlide key={month}>
                {({ isActive }) => (
                  <TransactionsSliderOption
                    index={index}
                    isActive={isActive}
                    month={month}
                  />
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </header>
      
      <div className='mt-4'>

      </div>
    </div>
  )
}