import { Controller } from 'react-hook-form'
import { formatMonth } from '../../../app/utils/formatMonth'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { InputCurrency } from '../InputCurrency'
import { useContributionRemindersController } from './useContributionRemindersController'

export function ContributionReminders() {
  const {
    currentReminder,
    control,
    errors,
    handleConfirm,
    handleSkip,
    handleClose,
    isConfirming,
    isSkipping,
    isAnswering
  } = useContributionRemindersController()

  if (!currentReminder) return null

  return (
    <Modal
      key={`${currentReminder.goalId}-${currentReminder.month}`}
      title='Lembrete de aporte'
      open
      onClose={handleClose}
    >
      <div className='space-y-1'>
        <span className='text-gray-600 tracking-[-0.5px] text-sm block'>Meta</span>
        <strong id='reminder-goal' className='text-gray-800 tracking-[-0.5px] text-lg block'>
          {currentReminder.goalName}
        </strong>
        <div className='flex gap-4 text-sm text-gray-700 tracking-[-0.5px]'>
          <span>
            Mês: <strong id='reminder-month'>{formatMonth(currentReminder.month)}</strong>
          </span>
          {currentReminder.bankAccount && (
            <span>Conta: <strong>{currentReminder.bankAccount.name}</strong></span>
          )}
        </div>
      </div>

      <form onSubmit={handleConfirm}>
        <div className='flex justify-center flex-col items-start'>
          <div className='flex items-center gap-2'>
            <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
            <Controller
              name='value'
              control={control}
              defaultValue={currentReminder.monthlyContribution}
              render={({ field: { onChange, value } }) => (
                <InputCurrency error={errors.value?.message} onChange={onChange} value={value} />
              )}
            />
          </div>

          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Valor do aporte</span>
        </div>

        <div className='mt-10 space-y-4'>
          <Button
            id='reminder-confirm'
            type='submit'
            className='w-full'
            isLoading={isConfirming}
            disabled={isAnswering}
          >
            Confirmar aporte
          </Button>
          <Button
            id='reminder-skip'
            type='button'
            className='w-full'
            ghost
            isLoading={isSkipping}
            disabled={isAnswering}
            onClick={handleSkip}
          >
            Não aportei
          </Button>
        </div>
      </form>
    </Modal>
  )
}
