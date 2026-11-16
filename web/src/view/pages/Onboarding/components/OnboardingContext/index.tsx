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
  isMoving: boolean
  isFinishing: boolean
  setHasItems(hasItems: boolean): void
  goTo(step: OnboardingStep): Promise<void>
  goNext(): Promise<void>
  goBack(): Promise<void>
  finish(): Promise<void>
}

export const OnboardingContext = createContext({} as OnboardingContextValue)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [hasItems, setHasItems] = useState(false)
  const moveMutation = useMutation(usersService.updateOnboardingStep)
  const finishMutation = useMutation(usersService.finishOnboarding)

  // AuthGuard renders this page only for a user with a step.
  const currentStep = user?.onboardingStep ?? ONBOARDING_STEPS[0].key
  const stepIndex = ONBOARDING_STEPS.findIndex(step => step.key === currentStep)

  function mergeStep(onboardingStep: OnboardingStep | null) {
    // Never invalidate ['users', 'me']: AuthProvider unmounts the whole app while it refetches.
    queryClient.setQueryData<User>(['users', 'me'], cached => cached && { ...cached, onboardingStep })
  }

  async function goTo(step: OnboardingStep) {
    if (step === currentStep) return

    try {
      const { onboardingStep } = await moveMutation.mutateAsync(step)
      // The next step's body reports its own items once it mounts.
      setHasItems(false)
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
      isMoving: moveMutation.isLoading,
      isFinishing: finishMutation.isLoading,
      setHasItems,
      goTo,
      goNext: () => goTo(ONBOARDING_STEPS[stepIndex + 1].key),
      goBack: () => goTo(ONBOARDING_STEPS[stepIndex - 1].key),
      finish
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}
