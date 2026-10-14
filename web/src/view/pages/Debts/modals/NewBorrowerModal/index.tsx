import { Controller } from 'react-hook-form'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { useNewBorrowerModalController } from './useNewBorrowerModalController'

interface NewBorrowerModalProps {
  open: boolean
  onClose(): void
}

export function NewBorrowerModal({ open, onClose }: NewBorrowerModalProps) {
  const { register, errors, control, handleSubmit, isLoading } = useNewBorrowerModalController(onClose)

  return (
    <Modal title='Nova pessoa' open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className='flex flex-col gap-4'>
          <div>
            <span className='text-gray-600 tracking-[-0.5px] text-xs'>Saldo anterior (quanto já devia antes do app)</span>
            <div className='flex items-center gap-1'>
              <span className='text-gray-600 tracking-[-0.5px]'>R$</span>
              <Controller
                name='openingBalance'
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputCurrency id='borrowerOpeningBalance' error={errors.openingBalance?.message} onChange={onChange} value={value} />
                )}
              />
            </div>
          </div>

          <Input
            id='borrowerName'
            type='text'
            placeholder='Nome da pessoa'
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        <Button id='borrowerSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          Cadastrar pessoa
        </Button>
      </form>
    </Modal>
  )
}
