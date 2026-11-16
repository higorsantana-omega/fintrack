import { Navigate, Outlet, useMatch } from 'react-router-dom'
import { useAuth } from '../app/hooks/useAuth'

interface AuthGuardProps {
  isPrivate: boolean;
}

export function AuthGuard({ isPrivate }: AuthGuardProps) {
  const { signedIn, user } = useAuth()
  const isOnboardingRoute = !!useMatch('/configuracao')

  if (!signedIn && isPrivate) {
    return <Navigate to='/login' replace />
  }

  if (signedIn && !isPrivate) {
    return <Navigate to='/' replace />
  }

  if (signedIn && user?.onboardingStep && !isOnboardingRoute) {
    return <Navigate to='/configuracao' replace />
  }

  if (signedIn && !user?.onboardingStep && isOnboardingRoute) {
    return <Navigate to='/' replace />
  }

  return <Outlet />
}
