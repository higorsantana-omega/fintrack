import { Accounts } from './components/Accounts'
import { DashboardContext, DashboardProvider } from './components/DashboardContext'
import { Fab } from './components/Fab'
import { Transactions } from './components/Transactions'
import { EditAccountModal } from './modals/EditAccountModal'
import { NewAccountModal } from './modals/NewAccountModal'
import { NewTransactionModal } from './modals/NewTransactionModal'

export function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContext.Consumer>
        {({ accountBeingEdited }) => (
          <>
            <main className='flex-1 flex flex-col md:flex-row gap-4 max-h-full'>
              <div className='w-full md:w-1/2'>
                <Accounts />
              </div>

              <div className='w-full md:w-1/2'>
                <Transactions />
              </div>
            </main>

            <Fab />
            <NewAccountModal />
            <NewTransactionModal />
            {accountBeingEdited && <EditAccountModal />}
          </>
        )}
      </DashboardContext.Consumer>
      
    </DashboardProvider>
    
  )
}