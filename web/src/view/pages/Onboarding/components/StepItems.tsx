import { Children, ReactNode } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { cn } from '../../../../app/utils/cn'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'

interface StepItemsProps {
  title?: string
  addLabel: string
  emptyMessage: string
  isLoading?: boolean
  onAdd(): void
  children: ReactNode
}

export function StepLoader() {
  return (
    <div className='py-8 flex justify-center'>
      <Spinner className='w-8 h-8' />
    </div>
  )
}

export function StepItemList({ children }: { children: ReactNode }) {
  return <ul className='rounded-2xl border border-gray-200 divide-y divide-gray-200 overflow-hidden'>{children}</ul>
}

export function StepEmpty({ children }: { children: ReactNode }) {
  return (
    <p className='py-8 px-4 rounded-2xl border border-dashed border-gray-300 text-center text-sm text-gray-600 tracking-[-0.5px]'>
      {children}
    </p>
  )
}

export function StepItems({ title, addLabel, emptyMessage, isLoading, onAdd, children }: StepItemsProps) {
  const isEmpty = Children.count(children) === 0

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-4'>
        {title && <h2 className='font-medium text-gray-800 tracking-[-0.5px]'>{title}</h2>}
        <Button className='ml-auto h-10 gap-2 px-4 whitespace-nowrap' onClick={onAdd}>
          <Plus className='w-4 h-4' />
          {addLabel}
        </Button>
      </div>

      {isEmpty && isLoading && <StepLoader />}

      {isEmpty && !isLoading && <StepEmpty>{emptyMessage}</StepEmpty>}

      {!isEmpty && <StepItemList>{children}</StepItemList>}
    </div>
  )
}

interface StepItemProps {
  name: string
  detail?: string
  value?: string
  color?: string
  className?: string
  onClick(): void
}

export function StepItem({ name, detail, value, color, className, onClick }: StepItemProps) {
  return (
    <li>
      <button
        type='button'
        onClick={onClick}
        className={cn(
          'w-full min-h-[56px] px-4 py-2 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors outline-offset-[-2px]',
          className
        )}
      >
        {color && <span className='w-2.5 h-2.5 shrink-0 rounded-full' style={{ backgroundColor: color }} />}

        <span className='flex-1 min-w-0'>
          <span className='block truncate font-medium text-gray-800 tracking-[-0.5px]'>{name}</span>
          {detail && <span className='block truncate text-sm text-gray-600 tracking-[-0.5px]'>{detail}</span>}
        </span>

        {value && <span className='whitespace-nowrap font-medium text-gray-800 tabular-nums'>{value}</span>}
        <ChevronRight className='w-4 h-4 shrink-0 text-gray-400' />
      </button>
    </li>
  )
}
