import { CreditCard } from '../../../../../app/entities/CreditCard'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { CardFormFields } from '../../../../components/CardFormFields'
import { useEditCardModalController } from './useEditCardModalController'

interface EditCardModalProps {
  card: CreditCard
  onClose(): void
}

export function EditCardModal({ card, onClose }: EditCardModalProps) {
  const { register, errors, control, handleSubmit, isLoading } = useEditCardModalController(card, onClose)

  return (
    <Modal title='Editar cartão' open onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <CardFormFields control={control} register={register} errors={errors} />

        <p className='mt-4 text-sm text-gray-700 tracking-[-0.5px]'>
          Novos dias de fechamento e vencimento valem da fatura aberta em diante; as faturas fechadas mantêm as datas.
        </p>

        <Button type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>
      </form>
    </Modal>
  )
}
