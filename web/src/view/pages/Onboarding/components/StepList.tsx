import { OnboardingStep } from '../../../../app/entities/User'
import { cn } from '../../../../app/utils/cn'
import { ONBOARDING_STEPS } from '../../../constants/OnboardingConstants'

interface StepListProps {
  currentIndex: number
  disabled: boolean
  onSelect(step: OnboardingStep): void
}

export function StepList({ currentIndex, disabled, onSelect }: StepListProps) {
  const progress = ((currentIndex + 1) / ONBOARDING_STEPS.length) * 100

  return (
    <nav aria-label='Etapas da configuração' className='flex flex-col gap-6'>
      <div className='space-y-2'>
        <span className='text-sm font-medium tracking-[-0.5px] text-gray-700'>
          {currentIndex + 1} de {ONBOARDING_STEPS.length}
        </span>
        <div className='h-1 rounded-full bg-gray-200'>
          <div className='h-full rounded-full bg-teal-900 transition-all' style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ol className='flex flex-col gap-1'>
        {ONBOARDING_STEPS.map((step, index) => {
          const isCurrent = index === currentIndex

          return (
            <li key={step.key}>
              <button
                type='button'
                disabled={disabled}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onSelect(step.key)}
                className={cn(
                  'w-full h-10 px-3 rounded-xl flex items-center gap-3 text-left text-sm font-medium tracking-[-0.5px] text-gray-700 hover:text-gray-900 transition-colors disabled:cursor-wait',
                  isCurrent && 'bg-white text-teal-900 hover:text-teal-900 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)]'
                )}
              >
                <span
                  className={cn(
                    'w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-700',
                    isCurrent && 'bg-teal-900 text-white'
                  )}
                >
                  {index + 1}
                </span>
                {step.label}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
