import { ColorsDropdownInput } from '../../../../components/ColorsDropdownInput'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { useNewAccountModalController } from './useNewAccountModalController'

export function NewAccountModal() {
  const {
    isNewAccountModalOpen,
    toggleCloseNewAccountModal
  } = useNewAccountModalController()

  return (
    <Modal title='Nova Conta' open={isNewAccountModalOpen} onClose={toggleCloseNewAccountModal}>
      <form>
        <div className='flex justify-center flex-col items-start'>
          <div className='flex items-center gap-2'>
            <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
            <InputCurrency />
          </div>

          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Saldo</span>
        </div>

        <div className='mt-10 flex flex-col gap-4'>
          <Input 
            type='text'
            name='name'
            placeholder='Nome da conta'
          />

          <Select
            placeholder='Tipo'
            options={[
              {
                value: 'CHECKING',
                label: 'Conta corrente'
              },
              {
                value: 'INVESTMENT',
                label: 'Investimentos'
              },
              {
                value: 'CASH',
                label: 'Dinheiro'
              }
            ]}
          />

          <ColorsDropdownInput />
        </div>
      </form>
    </Modal>
  )
}