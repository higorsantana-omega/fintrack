import { FilterIcon } from '../../../../components/icons/FilterIcon'
import { Swiper, SwiperSlide } from 'swiper/react'
import { MONTHS } from '../../../../../app/config/constants'
import { TransactionsSliderOption } from './TransactionsSliderOption'
import { TransactionsSliderNavigation } from './TransactionsSliderNavigation'
import { CategoryIcon } from '../../../../components/icons/categories/CategoryIcon'
import { useTransactionsController } from './useTransactionsController'
import { cn } from '../../../../../app/utils/cn'
import { Spinner } from '../../../../components/Spinner'
import emptyStateImage from '../../../../../assets/empty-state.svg'
import { TransactionTypeDropdown } from './TransactionTypeDropdown'
import { FiltersModal } from './FiltersModal'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'
import { formatDate } from '../../../../../app/utils/formatDate'

export function Transactions() {
  const { filters, handleChangeFilters, areValuesVisible, isLoading, isInitialLoading, transactions, handleCloseFiltersModal, handleOpenFiltersModal, isFiltersModalOpen } = useTransactionsController()

  return (
    <div className='bg-gray-100 rounded-2xl w-full h-full md:p-10 px-4 py-8 flex flex-col'>
      {isInitialLoading && (
        <div className='w-full h-full flex items-center justify-center'>
          <Spinner className='w-10 h-10'/>
        </div>
      )}
      {!isInitialLoading && (
        <>
          <FiltersModal
            open={isFiltersModalOpen}
            onClose={handleCloseFiltersModal}
          />

          <header>
            <div className='flex items-center justify-between'>
              <TransactionTypeDropdown
                onSelect={handleChangeFilters('type')}
                selectedType={filters.type}
              />

              <button onClick={handleOpenFiltersModal}>
                <FilterIcon />
              </button>
            </div>

            <div className='mt-6 relative'>
              <Swiper
                slidesPerView={3}
                centeredSlides
                initialSlide={filters.month}
                onSlideChange={swiper => {
                  handleChangeFilters('month')(swiper.realIndex)
                }}
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
      
          <div className='mt-4 space-y-2 flex-1 overflow-y-auto'>
            {isLoading && (
              <div className='flex items-center justify-center flex-col h-full'>
                <Spinner className='w-10 h-10'/>
              </div>
            )}
          
            {(transactions.length === 0 && !isLoading) && (
              <div className='flex items-center justify-center flex-col h-full'>
                <img src={emptyStateImage} alt='Empty state'/>
                <p className='text-gray-700'>Nao encontramos nenhuma transacao!</p>
              </div>
            )}
  
            {(transactions.length > 0 && !isLoading) && (
              <>
                {transactions.map(transaction => (
                  <div className='bg-white p-4 rounded-2xl flex items-center justify-between gap-4'>
                    <div className='flex-1 flex items-center gap-3'>
                      <CategoryIcon
                        type={transaction.type === 'EXPENSE' ? 'expense' : 'income'}
                        category={transaction.category?.icon}
                      />

                      <div>
                        <strong className='font-bold tracking-[-0.5px] block'>{transaction.name}</strong>
                        <span className='text-sm text-gray-600'>{formatDate(new Date(transaction.date))}</span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'tracking-[-0.5px] font-medium',
                        transaction.type === 'EXPENSE' ? 'text-red-800' : 'text-green-800',
                        !areValuesVisible && 'blur-[8px]'
                      )}
                    >
                      {transaction.type === 'EXPENSE' ? '-' : '+'} {formatCurrency(transaction.value)}
                    </span>
                  </div>
                ))}
                
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}