import { createContext, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { OnboardingStep, User } from '../../../../../app/entities/User'
import { useAuth } from '../../../../../app/hooks/useAuth'
import { usersService } from '../../../../../app/services/usersService'
import { ONBOARDING_STEPS } from '../../../../constants/OnboardingConstants'

interface OnboardingContextValue {
  currentStep: OnboardingStep
  stepIndex: number
  hasItems: boolean
  /** The item "Corrigir" on the review step opened; saving it returns there (R24). */
  correctionId: string | null
  isMoving: boolean
  isFinishing: boolean
  setHasItems(hasItems: boolean): void
  goTo(step: OnboardingStep): Promise<void>
  /** Opens the step of the item that `itemId` names, to correct it from the review step. */
  correct(step: OnboardingStep, itemId: string): Promise<void>
  goNext(): Promise<void>
  goBack(): Promise<void>
  finish(): Promise<void>
}

export const OnboardingContext = createContext({} as OnboardingContextValue)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [hasItems, setHasItems] = useState(false)
  // Session state only: reloading the page drops the way back to the review step.
  const [correctionId, setCorrectionId] = useState<string | null>(null)
  const moveMutation = useMutation(usersService.updateOnboardingStep)
  const finishMutation = useMutation(usersService.finishOnboarding)

  // AuthGuard renders this page only for a user with a step.
  const currentStep = user?.onboardingStep ?? ONBOARDING_STEPS[0].key
  const stepIndex = ONBOARDING_STEPS.findIndex(step => step.key === currentStep)

  function mergeStep(onboardingStep: OnboardingStep | null) {
    // Never invalidate ['users', 'me']: AuthProvider unmounts the whole app while it refetches.
    queryClient.setQueryData<User>(['users', 'me'], cached => cached && { ...cached, onboardingStep })
  }

  async function goTo(step: OnboardingStep, nextCorrectionId: string | null = null) {
    if (step === currentStep) return

    try {
      const { onboardingStep } = await moveMutation.mutateAsync(step)
      // The next step's body reports its own items once it mounts.
      setHasItems(false)
      setCorrectionId(nextCorrectionId)
      mergeStep(onboardingStep)
    } catch {
      toast.error('Erro ao trocar de etapa.')
    }
  }

  async function finish() {
    try {
      const { onboardingStep } = await finishMutation.mutateAsync()
      // With a null step, AuthGuard sends the user from /configuracao to /.
      mergeStep(onboardingStep)
    } catch {
      toast.error('Erro ao sair da configuração.')
    }
  }

  return (
    <OnboardingContext.Provider value={{
      currentStep,
      stepIndex,
      hasItems,
      correctionId,
      isMoving: moveMutation.isLoading,
      isFinishing: finishMutation.isLoading,
      setHasItems,
      goTo: step => goTo(step),
      correct: goTo,
      goNext: () => goTo(ONBOARDING_STEPS[stepIndex + 1].key),
      goBack: () => goTo(ONBOARDING_STEPS[stepIndex - 1].key),
      finish
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}
