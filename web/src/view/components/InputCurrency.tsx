import { NumericFormat } from 'react-number-format'

export function InputCurrency () {
  return (
    <NumericFormat
      className='w-full text-gray-800 text-[32px] tracking-[-1px] font-bold outline-none'
      thousandSeparator='.'
      decimalSeparator=','
      defaultValue='0,00'
    />
  )
}
