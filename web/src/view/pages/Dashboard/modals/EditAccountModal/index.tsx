import { Controller } from 'react-hook-form'
import { Button } from '../../../../components/Button'
import { ColorsDropdownInput } from '../../../../components/ColorsDropdownInput'
import { Input } from '../../../../components/Input'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { useEditAccountModalController } from './useEditAccountModalController'

export function EditAccountModal() {
  const {
    isEditAccountModalOpen,
    toggleOpenEditAccountModal,
    errors,
    handleSubmit,
    register,
    control,
    isLoading
  } = useEditAccountModalController()

  return (
    <Modal title='Editar conta' open={isEditAccountModalOpen} onClose={toggleOpenEditAccountModal}>
      <form onSubmit={handleSubmit}>
        <div className='flex justify-center flex-col items-start'>
          <div className='flex items-center gap-2'>
            <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
            
            <Controller 
              name='initialBalance'
              control={control}
              defaultValue='0,00'
              render={({ field: { onChange, value } }) => (
                <InputCurrency error={errors.initialBalance?.message} onChange={onChange} value={value} />
              )}
            />
          </div>

          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Saldo</span>
        </div>

        <div className='mt-10 flex flex-col gap-4'>
          <Input 
            type='text'
            error={errors.name?.message}
            placeholder='Nome da conta'
            {...register('name')}
          />

          <Controller 
            control={control}
            name='type'
            defaultValue='CHECKING'
            render={({ field: { onChange, value }}) => (
              <Select
                placeholder='Tipo'
                error={errors.type?.message}
                onChange={onChange}
                value={value}
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
            )}
          />

          <Controller 
            control={control}
            name='color'
            render={({ field: { onChange, value }}) => (
              <ColorsDropdownInput
                error={errors.color?.message}
                onChange={onChange}
                value={value}
              />
            )}
          />
        </div>

        <Button type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>
      </form>
    </Modal>
  )
}