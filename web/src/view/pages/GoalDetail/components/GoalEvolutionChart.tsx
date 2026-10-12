import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GoalEvolutionPoint } from '../../../../app/entities/Goal'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatCompactCurrency } from '../../../../app/utils/formatCompactCurrency'
import { formatMonth } from '../../../../app/utils/formatMonth'
import { GOAL_CHART_COLORS } from '../../../constants/GoalConstants'

interface GoalEvolutionChartProps {
  data: GoalEvolutionPoint[]
}

export function GoalEvolutionChart({ data }: GoalEvolutionChartProps) {
  const points = data.map(point => ({ ...point, label: formatMonth(point.month, true) }))

  return (
    <div className='bg-gray-100 rounded-2xl p-6 md:p-8 flex flex-col gap-4 min-w-0'>
      <strong className='text-gray-800 tracking-[-1px] text-lg'>Evolução: planejado x real</strong>

      <div className='h-64 w-full' aria-label='Gráfico do valor planejado e do valor real guardado por mês'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GOAL_CHART_COLORS.grid} />
            <XAxis
              dataKey='label'
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: GOAL_CHART_COLORS.tick }}
            />
            <YAxis
              width={72}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompactCurrency}
              tick={{ fontSize: 12, fill: GOAL_CHART_COLORS.tick }}
            />
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value)), name]}
              contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0px 11px 20px 0px rgba(0,0,0,0.10)' }}
              labelStyle={{ color: '#343A40', fontWeight: 500 }}
              itemStyle={{ color: '#495057' }}
            />
            <Legend
              iconType='plainline'
              wrapperStyle={{ fontSize: 12 }}
              formatter={value => <span className='text-gray-700'>{value}</span>}
            />
            <Line
              type='monotone'
              dataKey='planned'
              name='Planejado'
              stroke={GOAL_CHART_COLORS.planned}
              strokeWidth={2}
              strokeDasharray='6 4'
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Line
              type='monotone'
              dataKey='actual'
              name='Real'
              stroke={GOAL_CHART_COLORS.actual}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
