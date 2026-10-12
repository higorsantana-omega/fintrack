import { PlusIcon } from '@radix-ui/react-icons'
import { cn } from '../../../app/utils/cn'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { GOAL_STATUS_TABS } from '../../constants/GoalConstants'
import { GoalsProvider } from './components/GoalsContext'
import { GoalCard } from './components/GoalCard'
import { GoalsSummary } from './components/GoalsSummary'
import { SavedByMonthChart } from './components/SavedByMonthChart'
import { NewGoalModal } from './modals/NewGoalModal'
import { useGoalsController } from './useGoalsController'

function GoalsContent() {
  const {
    summary,
    isLoadingSummary,
    isLoadingGoals,
    goalsByStatus,
    activeStatus,
    setActiveStatus,
    toggleCloseNewGoalModal
  } = useGoalsController()

  const activeTab = GOAL_STATUS_TABS.find(tab => tab.status === activeStatus)!
  const visibleGoals = goalsByStatus[activeStatus]

  return (
    <main className='flex-1 flex flex-col gap-4'>
      <section className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4'>
        {isLoadingSummary && (
          <div className='lg:col-span-2 h-72 flex items-center justify-center'>
            <Spinner className='w-10 h-10' />
          </div>
        )}

        {!isLoadingSummary && (
          <>
            <GoalsSummary
              monthlyContribution={summary?.monthlyContribution ?? 0}
              totalSaved={summary?.totalSaved ?? 0}
            />
            <SavedByMonthChart data={summary?.savedByMonth ?? []} />
          </>
        )}
      </section>

      <section className='flex-1 bg-gray-100 rounded-2xl p-4 md:p-8 flex flex-col gap-6'>
        <header className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div role='tablist' className='flex gap-2 overflow-x-auto'>
            {GOAL_STATUS_TABS.map(tab => (
              <button
                key={tab.status}
                role='tab'
                aria-selected={tab.status === activeStatus}
                onClick={() => setActiveStatus(tab.status)}
                className={cn(
                  'h-10 px-4 rounded-full text-sm font-medium tracking-[-0.5px] whitespace-nowrap transition-colors text-gray-700 hover:bg-gray-200',
                  tab.status === activeStatus && 'bg-teal-900 text-white hover:bg-teal-900'
                )}
              >
                {tab.label} ({goalsByStatus[tab.status].length})
              </button>
            ))}
          </div>

          <Button className='h-10 gap-2' onClick={toggleCloseNewGoalModal}>
            <PlusIcon className='w-4 h-4' />
            Nova meta
          </Button>
        </header>

        {isLoadingGoals && (
          <div className='flex-1 flex items-center justify-center'>
            <Spinner className='w-10 h-10' />
          </div>
        )}

        {!isLoadingGoals && visibleGoals.length === 0 && (
          <div className='flex-1 flex items-center justify-center text-gray-600 py-10'>
            {activeTab.emptyMessage}
          </div>
        )}

        {!isLoadingGoals && visibleGoals.length > 0 && (
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
            {visibleGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </section>

      <NewGoalModal />
    </main>
  )
}

export function Goals() {
  return (
    <GoalsProvider>
      <GoalsContent />
    </GoalsProvider>
  )
}
