import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GoalsSummary } from '../../../../app/entities/Goal'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { formatCompactCurrency } from '../../../../app/utils/formatCompactCurrency'
import { formatMonth } from '../../../../app/utils/formatMonth'
import { GOAL_CHART_COLORS } from '../../../constants/GoalConstants'

interface SavedByMonthChartProps {
  data: GoalsSummary['savedByMonth']
}

export function SavedByMonthChart({ data }: SavedByMonthChartProps) {
  const points = data.map(point => ({ ...point, label: formatMonth(point.month, true) }))

  return (
    <div className='bg-gray-100 rounded-2xl p-6 md:p-8 flex flex-col gap-4 min-w-0'>
      <strong className='text-gray-800 tracking-[-1px] text-lg'>Dinheiro guardado por mês</strong>

      {points.length === 0 && (
        <div className='h-56 flex items-center justify-center text-center text-gray-600 text-sm'>
          Crie uma meta para acompanhar quanto você já guardou.
        </div>
      )}

      {points.length > 0 && (
        <div className='h-56 w-full' aria-label='Gráfico do total guardado acumulado por mês'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id='savedByMonthFill' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor={GOAL_CHART_COLORS.actual} stopOpacity={0.25} />
                  <stop offset='100%' stopColor={GOAL_CHART_COLORS.actual} stopOpacity={0} />
                </linearGradient>
              </defs>
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
                formatter={value => [formatCurrency(Number(value)), 'Guardado']}
                contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0px 11px 20px 0px rgba(0,0,0,0.10)' }}
                labelStyle={{ color: '#343A40', fontWeight: 500 }}
                itemStyle={{ color: '#495057' }}
              />
              <Area
                type='monotone'
                dataKey='saved'
                stroke={GOAL_CHART_COLORS.actual}
                strokeWidth={2}
                fill='url(#savedByMonthFill)'
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
