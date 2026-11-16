import { OnboardingStep, User } from '../entities/User'
import { httpClient } from './httpClient'

type MeResponse = User

interface OnboardingResponse {
  onboardingStep: OnboardingStep | null
}

async function me() {
  const { data } = await httpClient.get<MeResponse>('/users/me')
  return data
}

async function updateOnboardingStep(step: OnboardingStep) {
  const { data } = await httpClient.patch<OnboardingResponse>('/users/me/onboarding', { step })
  return data
}

async function finishOnboarding() {
  const { data } = await httpClient.delete<OnboardingResponse>('/users/me/onboarding')
  return data
}

export const usersService = {
  me,
  updateOnboardingStep,
  finishOnboarding
}
