import { ComponentProps, ComponentType } from 'react'
import { cn } from '../../../../app/utils/cn'

interface GoalActionButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  label: string
  icon: ComponentType<{ className?: string }>
  primary?: boolean
}

export function GoalActionButton({ label, icon: Icon, primary, className, ...props }: GoalActionButtonProps) {
  return (
    <button
      type='button'
      aria-label={label}
      {...props}
      className={cn(
        'group h-10 shrink-0 rounded-2xl font-medium flex items-center justify-end overflow-hidden transition-colors duration-200 ease-out',
        primary ? 'bg-white text-teal-900 hover:bg-teal-50' : 'bg-white/[0.15] text-white hover:bg-white/25',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden',
          'transition-all duration-200 ease-out motion-reduce:transition-none',
          'md:group-hover:w-0 md:group-hover:opacity-0 md:group-focus-visible:w-0 md:group-focus-visible:opacity-0'
        )}
      >
        <Icon className='w-5 h-5' />
      </span>
      <span
        className={cn(
          'grid grid-cols-[0fr] opacity-0 overflow-hidden',
          'transition-[grid-template-columns,opacity] duration-200 ease-out motion-reduce:transition-none',
          'md:group-hover:grid-cols-[1fr] md:group-hover:opacity-100 md:group-focus-visible:grid-cols-[1fr] md:group-focus-visible:opacity-100'
        )}
      >
        <span className='min-w-0 overflow-hidden whitespace-nowrap'>
          <span className='inline-block px-5'>{label}</span>
        </span>
      </span>
    </button>
  )
}
