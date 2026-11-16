import { OnboardingStep } from '../../../../app/entities/User'
import { Button } from '../../../components/Button'
import { useOnboarding } from './OnboardingContext/useOnboarding'

interface MissingPrerequisiteProps {
  message: string
  backLabel: string
  backStep: OnboardingStep
}

export function MissingPrerequisite({ message, backLabel, backStep }: MissingPrerequisiteProps) {
  const { goTo, goNext, isMoving } = useOnboarding()

  return (
    <div className='p-6 rounded-2xl border border-gray-200 flex flex-col gap-4'>
      <p className='text-gray-800 tracking-[-0.5px]'>{message}</p>
      <div className='flex flex-wrap gap-2'>
        <Button className='h-10 px-4' onClick={() => goTo(backStep)} disabled={isMoving}>{backLabel}</Button>
        <Button className='h-10 px-4' ghost onClick={goNext} disabled={isMoving}>Pular</Button>
      </div>
    </div>
  )
}
