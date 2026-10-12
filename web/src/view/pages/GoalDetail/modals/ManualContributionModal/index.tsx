import { Controller } from 'react-hook-form'
import { GoalDetail } from '../../../../../app/entities/Goal'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { InputCurrency } from '../../../../components/InputCurrency'
import { DatePickerInput } from '../../../../components/DatePickerInput'
import { useManualContributionModalController } from './useManualContributionModalController'

interface ManualContributionModalProps {
  goal: GoalDetail
  open: boolean
  onClose(): void
}

export function ManualContributionModal({ goal, open, onClose }: ManualContributionModalProps) {
  const { control, errors, handleSubmit, isLoading } = useManualContributionModalController(goal, onClose)

  return (
    <Modal title='Novo aporte' open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className='flex justify-center flex-col items-start'>
          <div className='flex items-center gap-2'>
            <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
            <Controller
              name='value'
              control={control}
              render={({ field: { onChange, value } }) => (
                <InputCurrency id='contributionValue' error={errors.value?.message} onChange={onChange} value={value} />
              )}
            />
          </div>

          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Valor do aporte</span>
        </div>

        <div className='mt-10 flex flex-col gap-4'>
          <Controller
            control={control}
            name='date'
            render={({ field: { value, onChange } }) => (
              <DatePickerInput id='contributionDate' error={errors.date?.message} value={value} onChange={onChange} />
            )}
          />

          <p className='text-sm text-gray-700 tracking-[-0.5px]'>
            Sai da conta <strong>{goal.bankAccount?.name}</strong> como despesa na categoria Metas.
          </p>
        </div>

        <Button type='submit' className='w-full mt-6' isLoading={isLoading}>
          Registrar aporte
        </Button>
      </form>
    </Modal>
  )
}
