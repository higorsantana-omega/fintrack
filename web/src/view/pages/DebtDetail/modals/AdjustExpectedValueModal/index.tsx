import { Controller } from 'react-hook-form'
import { DebtInstallment } from '../../../../../app/entities/Debt'
import { Modal } from '../../../../components/Modal'
import { Button } from '../../../../components/Button'
import { InputCurrency } from '../../../../components/InputCurrency'
import { useAdjustExpectedValueModalController } from './useAdjustExpectedValueModalController'

interface AdjustExpectedValueModalProps {
  debtId: string
  installmentsCount: number
  installment: DebtInstallment
  onClose(): void
}

export function AdjustExpectedValueModal({ debtId, installmentsCount, installment, onClose }: AdjustExpectedValueModalProps) {
  const { errors, control, handleSubmit, isLoading } = useAdjustExpectedValueModalController(debtId, installment, onClose)

  return (
    <Modal title='Ajustar valor' open onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p className='text-gray-800 tracking-[-0.5px] mb-4'>
          O novo valor vale da parcela {installment.number} até a {installmentsCount}. As parcelas pagas mantêm o valor que tinham.
        </p>

        <div>
          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Novo valor previsto</span>
          <div className='flex items-center gap-1'>
            <span className='text-gray-600 tracking-[-0.5px]'>R$</span>
            <Controller
              name='value'
              control={control}
              render={({ field: { onChange, value } }) => (
                <InputCurrency id='debtExpectedValue' error={errors.value?.message} onChange={onChange} value={value} />
              )}
            />
          </div>
        </div>

        <Button id='debtExpectedValueSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>
      </form>
    </Modal>
  )
}
