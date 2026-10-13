import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CardsSummary } from '../../../../app/entities/CreditCard'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatCompactCurrency } from '../../../../app/utils/formatCompactCurrency'
import { formatMonth } from '../../../../app/utils/formatMonth'
import { GOAL_CHART_AXIS, GOAL_CHART_TOOLTIP } from '../../../constants/GoalConstants'
import { CARD_CHART_COLORS } from '../../../constants/CardConstants'

type Point = CardsSummary['invoicesByMonth'][number]

interface InvoicesByMonthChartProps {
  data: Point[]
}

function ChartTooltip({ active, payload }: { active?: boolean, payload?: { payload: Point & { label: string } }[] }) {
  if (!active || !payload?.length) return null

  const point = payload[0].payload

  return (
    <div className='bg-white rounded-2xl p-3 text-sm text-gray-700 shadow-[0px_11px_20px_0px_rgba(0,0,0,0.10)] space-y-1'>
      <strong className='text-gray-800 block'>{point.label}{point.isFuture ? ' · futura' : ''}</strong>
      <span className='block'>Faturas: {formatCurrency(point.total)}</span>
      {point.forecast > 0 && <span className='block'>Previsões: {formatCurrency(point.forecast)}</span>}
      {point.credit > 0 && <span className='block'>Crédito: {formatCurrency(point.credit)}</span>}
    </div>
  )
}

export function InvoicesByMonthChart({ data }: InvoicesByMonthChartProps) {
  const points = data.map(point => ({ ...point, label: formatMonth(point.month, true) }))

  return (
    <div className='bg-gray-100 rounded-2xl p-6 md:p-8 flex flex-col gap-4 min-w-0'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <strong className='text-gray-800 tracking-[-1px] text-lg'>Faturas por mês</strong>
        <div className='flex gap-4 text-xs text-gray-600'>
          <span className='flex items-center gap-1'>
            <span className='w-3 h-3 rounded-sm' style={{ background: CARD_CHART_COLORS.invoice }} /> Fechadas e abertas
          </span>
          <span className='flex items-center gap-1'>
            <span className='w-3 h-3 rounded-sm' style={{ background: CARD_CHART_COLORS.future }} /> Futuras
          </span>
        </div>
      </div>

      <div className='h-56 w-full' aria-label='Gráfico das faturas de todos os cartões por mês de vencimento'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CARD_CHART_COLORS.grid} />
            <XAxis dataKey='label' {...GOAL_CHART_AXIS} />
            <YAxis width={72} tickFormatter={formatCompactCurrency} {...GOAL_CHART_AXIS} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} {...GOAL_CHART_TOOLTIP} />
            <Bar dataKey='value' radius={[6, 6, 0, 0]} minPointSize={2}>
              {points.map(point => (
                <Cell
                  key={point.month}
                  data-future={point.isFuture}
                  fill={point.isFuture ? CARD_CHART_COLORS.future : CARD_CHART_COLORS.invoice}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
