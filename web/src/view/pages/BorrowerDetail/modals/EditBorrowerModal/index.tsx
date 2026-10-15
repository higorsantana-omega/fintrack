import { Controller } from 'react-hook-form'
import { BorrowerDetail } from '../../../../../app/entities/Borrower'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { useEditBorrowerModalController } from './useEditBorrowerModalController'

interface EditBorrowerModalProps {
  borrower: BorrowerDetail
  onClose(): void
}

export function EditBorrowerModal({ borrower, onClose }: EditBorrowerModalProps) {
  const { register, errors, control, handleSubmit, isLoading } = useEditBorrowerModalController(borrower, onClose)

  return (
    <Modal title='Editar pessoa' open onClose={onClose}>
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
                  <InputCurrency id='editBorrowerOpeningBalance' error={errors.openingBalance?.message} onChange={onChange} value={value} />
                )}
              />
            </div>
          </div>

          <Input
            id='editBorrowerName'
            type='text'
            placeholder='Nome da pessoa'
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        <Button id='editBorrowerSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>
      </form>
    </Modal>
  )
}
