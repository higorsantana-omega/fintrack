import { Link } from 'react-router-dom'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { GoalFormFields } from '../../../../components/GoalFormFields'
import { useNewGoalModalController } from './useNewGoalModalController'

export function NewGoalModal() {
  const {
    isNewGoalModalOpen,
    toggleCloseNewGoalModal,
    accounts,
    createdAt,
    register,
    errors,
    control,
    setValue,
    handleSubmit,
    isLoading
  } = useNewGoalModalController()

  return (
    <Modal title='Nova meta' open={isNewGoalModalOpen} onClose={toggleCloseNewGoalModal}>
      {accounts.length === 0 && (
        <div className='flex flex-col items-center text-center gap-6'>
          <p id='goal-no-accounts' className='text-gray-800 tracking-[-0.5px]'>
            Para criar uma meta, cadastre antes uma conta no Dashboard. É dela que sairão os aportes.
          </p>
          <Link
            to='/'
            className='bg-teal-900 hover:bg-teal-800 px-6 h-12 rounded-2xl font-medium text-white flex items-center justify-center w-full'
          >
            Ir para o Dashboard
          </Link>
        </div>
      )}

      {accounts.length > 0 && (
        <form onSubmit={handleSubmit}>
          <GoalFormFields
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            accounts={accounts}
            contributionsTotal={0}
            createdAt={createdAt}
            resolvedMonths={[]}
          />

          <Button type='submit' className='w-full mt-6' isLoading={isLoading}>
            Criar meta
          </Button>
        </form>
      )}
    </Modal>
  )
}
