import { useCallback, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { UserMenu } from '../components/UserMenu'
import { ContributionReminders } from '../components/ContributionReminders'
import { InvoiceReminders } from '../components/InvoiceReminders'
import { InvoiceReminderBanner } from '../components/InvoiceReminders/InvoiceReminderBanner'
import { PayInvoiceProvider } from '../components/PayInvoiceModal/PayInvoiceContext'
import { useInvoiceReminders } from '../../app/hooks/useInvoiceReminders'
import { cn } from '../../app/utils/cn'

const navigation = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/metas', label: 'Metas', end: false },
  { to: '/cartoes', label: 'Cartões', end: false }
]

export function AppLayout() {
  const { reminders } = useInvoiceReminders()
  const [isInvoiceQueueDone, setIsInvoiceQueueDone] = useState(false)
  const handleInvoiceQueueDone = useCallback(() => setIsInvoiceQueueDone(true), [])

  return (
    <PayInvoiceProvider>
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
                {item.to === '/cartoes' && reminders.length > 0 && (
                  <span
                    id='cards-nav-dot'
                    aria-label='Faturas em lembrete'
                    className='absolute top-1.5 right-1 w-2 h-2 rounded-full bg-red-900'
                  />
                )}
              </NavLink>
            ))}
          </nav>

          <UserMenu />
        </header>

        <InvoiceReminderBanner />

        <Outlet />

        <InvoiceReminders onDone={handleInvoiceQueueDone} />
        <ContributionReminders isHeld={!isInvoiceQueueDone} />
      </div>
    </PayInvoiceProvider>
  )
}
