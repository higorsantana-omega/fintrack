import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Category } from '../../../../app/services/categoriesService'
import { getCategoryName } from '../../../../app/utils/categories'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { GOAL_CHART_TOOLTIP } from '../../../constants/GoalConstants'
import { SEM_CATEGORIA_LABEL } from '../../../constants/CategoryConstants'

const FALLBACK_COLOR = '#868E96'
const NO_CATEGORY_COLOR = '#CED4DA'
const EMPTY_COLOR = '#E9ECEF'

interface Slice {
  id: string
  /** Null for the "Sem categoria" slice. */
  category: Category | null
  total: number
}

interface CategoriesDonutProps {
  slices: Slice[]
  net: number
}

export function CategoriesDonut({ slices, net }: CategoriesDonutProps) {
  const isEmpty = slices.length === 0
  const data = isEmpty
    ? [{ id: 'empty', name: '', total: 1, fill: EMPTY_COLOR }]
    : slices.map(slice => ({
      id: slice.id,
      name: slice.category ? getCategoryName(slice.category) : SEM_CATEGORIA_LABEL,
      total: slice.total,
      fill: slice.category ? (slice.category.color ?? FALLBACK_COLOR) : NO_CATEGORY_COLOR
    }))

  return (
    <div
      className='relative h-64 w-full max-w-[16rem] mx-auto'
      role='img'
      aria-label='Gráfico de rosca do total do mês por grupo de categorias'
    >
      <ResponsiveContainer width='100%' height='100%'>
        <PieChart>
          <Pie
            data={data}
            dataKey='total'
            nameKey='name'
            innerRadius='68%'
            outerRadius='100%'
            paddingAngle={isEmpty ? 0 : 2}
            stroke='none'
            isAnimationActive={false}
          >
            {data.map(slice => <Cell key={slice.id} fill={slice.fill} />)}
          </Pie>
          {!isEmpty && (
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value)), name]}
              {...GOAL_CHART_TOOLTIP}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
        <span className='text-xs text-gray-600'>Total do mês</span>
        <strong id='categories-net' className='text-gray-800 tracking-[-1px] text-xl'>{formatCurrency(net)}</strong>
      </div>
    </div>
  )
}
