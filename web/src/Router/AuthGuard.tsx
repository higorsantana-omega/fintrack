import { Navigate, Outlet } from 'react-router-dom'

interface AuthGuardProps {
  isPrivate: boolean;
}

export function AuthGuard({ isPrivate }: AuthGuardProps) {
  const sigendIn = false

  if (!sigendIn && isPrivate) {
    return <Navigate to='/login' replace />
  }

  if (sigendIn && !isPrivate) {
    return <Navigate to='/' replace />
  }

  return <Outlet />
}
