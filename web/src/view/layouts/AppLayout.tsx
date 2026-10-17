import { useCallback, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { UserMenu } from '../components/UserMenu'
import { ContributionReminders } from '../components/ContributionReminders'
import { InvoiceReminders } from '../components/InvoiceReminders'
import { InvoiceReminderBanner } from '../components/InvoiceReminders/InvoiceReminderBanner'
import { DebtReminders } from '../components/DebtReminders'
import { DebtReminderBanner } from '../components/DebtReminders/DebtReminderBanner'
import { PayInvoiceProvider } from '../components/PayInvoiceModal/PayInvoiceContext'
import { PayDebtProvider } from '../components/PayDebtModal/PayDebtContext'
import { useInvoiceReminders } from '../../app/hooks/useInvoiceReminders'
import { useDebtReminders } from '../../app/hooks/useDebtReminders'
import { cn } from '../../app/utils/cn'

export function AppLayout() {
  const { reminders: invoiceReminders } = useInvoiceReminders()
  const { reminders: debtReminders } = useDebtReminders()
  const [isInvoiceQueueDone, setIsInvoiceQueueDone] = useState(false)
  const [isDebtQueueDone, setIsDebtQueueDone] = useState(false)
  const handleInvoiceQueueDone = useCallback(() => setIsInvoiceQueueDone(true), [])
  const handleDebtQueueDone = useCallback(() => setIsDebtQueueDone(true), [])

  const navigation = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/metas', label: 'Metas', end: false },
    {
      to: '/cartoes',
      label: 'Cartões',
      end: false,
      dot: { id: 'cards-nav-dot', label: 'Faturas em lembrete', isVisible: invoiceReminders.length > 0 }
    },
    {
      to: '/dividas',
      label: 'Dívidas',
      end: false,
      dot: { id: 'debts-nav-dot', label: 'Dívidas em lembrete', isVisible: debtReminders.length > 0 }
    },
    { to: '/categorias', label: 'Categorias', end: false }
  ]

  return (
    <PayInvoiceProvider>
      <PayDebtProvider>
        <div className='h-full w-full p-4 md:px-8 pb-8 pt-6 flex flex-col gap-4'>
          <header className='h-12 flex items-center justify-between gap-2'>
            <Logo className='h-5 md:h-6 text-teal-900 shrink-0'/>

            <nav className='flex items-center gap-1 bg-gray-100 rounded-2xl p-1'>
              {navigation.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    'relative h-10 px-2 md:px-4 rounded-xl flex items-center text-[13px] md:text-sm font-medium tracking-[-0.5px] text-gray-600 hover:text-gray-800 transition-colors',
                    isActive && 'bg-white text-teal-900 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)]'
                  )}
                >
                  {item.label}
                  {item.dot?.isVisible && (
                    <span
                      id={item.dot.id}
                      aria-label={item.dot.label}
                      className='absolute top-1.5 right-1 w-2 h-2 rounded-full bg-red-900'
                    />
                  )}
                </NavLink>
              ))}
            </nav>

            <UserMenu />
          </header>

          <InvoiceReminderBanner />
          <DebtReminderBanner />

          <Outlet />

          <InvoiceReminders onDone={handleInvoiceQueueDone} />
          <DebtReminders isHeld={!isInvoiceQueueDone} onDone={handleDebtQueueDone} />
          <ContributionReminders isHeld={!isInvoiceQueueDone || !isDebtQueueDone} />
        </div>
      </PayDebtProvider>
    </PayInvoiceProvider>
  )
}
