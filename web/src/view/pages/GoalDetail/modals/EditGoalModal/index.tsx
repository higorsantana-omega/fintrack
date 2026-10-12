import { GoalDetail } from '../../../../../app/entities/Goal'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { GoalFormFields } from '../../../../components/GoalFormFields'
import { useEditGoalModalController } from './useEditGoalModalController'

interface EditGoalModalProps {
  goal: GoalDetail
  open: boolean
  onClose(): void
}

export function EditGoalModal({ goal, open, onClose }: EditGoalModalProps) {
  const {
    accounts,
    register,
    errors,
    control,
    setValue,
    handleSubmit,
    isLoading,
    contributionsTotal,
    createdAt
  } = useEditGoalModalController(goal, onClose)

  return (
    <Modal title='Editar meta' open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <GoalFormFields
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
          accounts={accounts}
          contributionsTotal={contributionsTotal}
          createdAt={createdAt}
          resolvedMonths={goal.resolvedMonths}
        />

        <p className='text-xs text-gray-600 tracking-[-0.5px] mt-4'>
          As mudanças valem dos próximos meses em diante e não alteram aportes já feitos.
        </p>

        <Button type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>
      </form>
    </Modal>
  )
}
