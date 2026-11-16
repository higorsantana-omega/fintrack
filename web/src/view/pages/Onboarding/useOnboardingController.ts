import { useState } from 'react'
import { ONBOARDING_STEPS } from '../../constants/OnboardingConstants'
import { useOnboarding } from './components/OnboardingContext/useOnboarding'

function getPrimaryLabel(isLastStep: boolean, hasItems: boolean) {
  if (isLastStep) return 'Concluir'
  return hasItems ? 'Continuar' : 'Pular etapa'
}

export function useOnboardingController() {
  const { stepIndex, hasItems, isMoving, isFinishing, goTo, goNext, goBack, finish } = useOnboarding()
  const [isExitModalOpen, setIsExitModalOpen] = useState(false)

  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1

  return {
    step: ONBOARDING_STEPS[stepIndex],
    stepIndex,
    isFirstStep: stepIndex === 0,
    primaryLabel: getPrimaryLabel(isLastStep, hasItems),
    handlePrimary: isLastStep ? finish : goNext,
    goTo,
    goBack,
    finish,
    isMoving,
    isFinishing,
    isExitModalOpen,
    openExitModal: () => setIsExitModalOpen(true),
    closeExitModal: () => setIsExitModalOpen(false)
  }
}
