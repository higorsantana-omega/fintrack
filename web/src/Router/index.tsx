import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { Login } from '../view/pages/Login'
import { Register } from '../view/pages/Register'
import { AuthLayout } from '../view/layouts/AuthLayout'
import { Dashboard } from '../view/pages/Dashboard'
import { AppLayout } from '../view/layouts/AppLayout'
import { Goals } from '../view/pages/Goals'
import { GoalDetail } from '../view/pages/GoalDetail'
import { Cards } from '../view/pages/Cards'
import { CardDetail } from '../view/pages/CardDetail'
import { Debts } from '../view/pages/Debts'
import { DebtDetail } from '../view/pages/DebtDetail'
import { BorrowerDetail } from '../view/pages/BorrowerDetail'
import { Categories } from '../view/pages/Categories'

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
            <Route path='/metas' element={<Goals />}/>
            <Route path='/metas/:goalId' element={<GoalDetail />}/>
            <Route path='/cartoes' element={<Cards />}/>
            <Route path='/cartoes/:cardId' element={<CardDetail />}/>
            <Route path='/dividas' element={<Debts />}/>
            <Route path='/dividas/:debtId' element={<DebtDetail />}/>
            <Route path='/dividas/pessoas/:borrowerId' element={<BorrowerDetail />}/>
            <Route path='/categorias' element={<Categories />}/>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
