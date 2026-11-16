import { ComponentType } from 'react'
import { OnboardingStep } from '../../../app/entities/User'
import { Logo } from '../../components/Logo'
import { UserMenu } from '../../components/UserMenu'
import { ExitOnboardingModal } from './components/ExitOnboardingModal'
import { OnboardingProvider } from './components/OnboardingContext'
import { StepFooter } from './components/StepFooter'
import { StepList } from './components/StepList'
import { AccountsStep } from './steps/AccountsStep'
import { BudgetsStep } from './steps/BudgetsStep'
import { CardsStep } from './steps/CardsStep'
import { DebtsStep } from './steps/DebtsStep'
import { GoalsStep } from './steps/GoalsStep'
import { WishlistStep } from './steps/WishlistStep'
import { useOnboardingController } from './useOnboardingController'

// The content of each step, under its title. A step without an entry shows only its title and help text.
const STEP_BODIES: Partial<Record<OnboardingStep, ComponentType>> = {
  ACCOUNTS: AccountsStep,
  CARDS: CardsStep,
  BUDGETS: BudgetsStep,
  GOALS: GoalsStep,
  DEBTS: DebtsStep,
  WISHLIST: WishlistStep
}

function OnboardingContent() {
  const {
    step,
    stepIndex,
    isFirstStep,
    primaryLabel,
    handlePrimary,
    goTo,
    goBack,
    finish,
    isMoving,
    isFinishing,
    isExitModalOpen,
    openExitModal,
    closeExitModal
  } = useOnboardingController()

  const StepBody = STEP_BODIES[step.key]

  return (
    <div className='min-h-full flex flex-col md:flex-row'>
      <aside className='md:w-72 shrink-0 bg-gray-100 p-6 md:p-8 flex flex-col gap-8'>
        <Logo className='h-6 self-start text-teal-900' />
        <StepList currentIndex={stepIndex} disabled={isMoving || isFinishing} onSelect={goTo} />
      </aside>

      <main className='flex-1 min-w-0 p-6 md:px-12 md:py-8 flex flex-col gap-8'>
        <header className='flex items-center justify-end gap-2'>
          <button
            type='button'
            onClick={openExitModal}
            className='h-10 px-4 rounded-xl text-sm font-medium tracking-[-0.5px] text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors'
          >
            Sair da configuração
          </button>
          <UserMenu />
        </header>

        <section className='flex-1 w-full max-w-3xl mx-auto flex flex-col gap-6'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-[-1px] text-gray-900'>{step.title}</h1>
            <p className='tracking-[-0.5px] text-gray-700'>{step.help}</p>
          </div>

          {StepBody && <StepBody key={step.key} />}
        </section>

        <StepFooter
          showBack={!isFirstStep}
          primaryLabel={primaryLabel}
          isLoading={isMoving || isFinishing}
          onBack={goBack}
          onPrimary={handlePrimary}
        />
      </main>

      <ExitOnboardingModal
        open={isExitModalOpen}
        isLoading={isFinishing}
        onConfirm={finish}
        onClose={closeExitModal}
      />
    </div>
  )
}

export function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  )
}
