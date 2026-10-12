import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { Login } from '../view/pages/Login'
import { Register } from '../view/pages/Register'
import { AuthLayout } from '../view/layouts/AuthLayout'
import { Dashboard } from '../view/pages/Dashboard'
import { AppLayout } from '../view/layouts/AppLayout'

export function Router () {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthGuard isPrivate={false} />}>
          <Route element={<AuthLayout />}>
            <Route path='/login' element={<Login />}/>
            <Route path='/register' element={<Register />}/>
          </Route>
        </Route>
      
        <Route element={<AuthGuard isPrivate />}>
          <Route element={<AppLayout />}>
            <Route path='/' element={<Dashboard />}/>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
