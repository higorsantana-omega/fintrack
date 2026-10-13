import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { CardFormFields } from '../../../../components/CardFormFields'
import { useNewCardModalController } from './useNewCardModalController'

interface NewCardModalProps {
  open: boolean
  onClose(): void
}

export function NewCardModal({ open, onClose }: NewCardModalProps) {
  const { register, errors, control, handleSubmit, isLoading } = useNewCardModalController(onClose)

  return (
    <Modal title='Novo cartão' open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <CardFormFields control={control} register={register} errors={errors} />

        <Button type='submit' className='w-full mt-6' isLoading={isLoading}>
          Cadastrar cartão
        </Button>
      </form>
    </Modal>
  )
}
