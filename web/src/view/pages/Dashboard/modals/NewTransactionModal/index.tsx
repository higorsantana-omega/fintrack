import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { DatePickerInput } from '../../../../components/DatePickerInput'
import { useNewTransactionModalController } from './useTransactionModalController'

export function NewTransactionModal() {
  const {
    isNewTransactionModalOpen,
    toggleOpenTransactionModal,
    newTransactionType
  } = useNewTransactionModalController()

  const isExpense = newTransactionType === 'EXPENSE'

  return (
    <Modal title={isExpense ? 'Nova Despesa' : 'Nova Receita'} open={isNewTransactionModalOpen} onClose={() => toggleOpenTransactionModal(newTransactionType)}>
      <form>
        <div className='flex justify-center flex-col items-start'>
          <div className='flex items-center gap-2'>
            <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
            <InputCurrency />
          </div>

          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Valor {isExpense ? 'da despesa' : 'da receita'}</span>
        </div>

        <div className='mt-10 flex flex-col gap-4'>
          <Input 
            type='text'
            name='name'
            placeholder={isExpense ? 'Nome da Despesa' : 'Nome da Receita'}
          />

          <Select
            placeholder='Categoria'
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

          <Select
            placeholder={isExpense ? 'Pagar com' : 'Receber na conta'}
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

          <DatePickerInput />
        </div>
      </form>
    </Modal>
  )
}