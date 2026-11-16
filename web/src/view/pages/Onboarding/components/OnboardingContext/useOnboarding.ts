import { useContext } from 'react'
import { OnboardingContext } from '.'

export function useOnboarding() {
  return useContext(OnboardingContext)
}
