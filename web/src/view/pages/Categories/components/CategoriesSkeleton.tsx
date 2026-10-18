interface CategoriesSkeletonProps {
  /** One placeholder row per group, so the page keeps its height while the month loads. */
  groups: number
}

export function CategoriesSkeleton({ groups }: CategoriesSkeletonProps) {
  return (
    <div
      id='categories-skeleton'
      aria-busy='true'
      aria-label='Carregando o mês'
      className='grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6 items-start animate-pulse'
    >
      <div className='h-64 w-64 mx-auto rounded-full border-[2.5rem] border-gray-200' />

      <ul className='space-y-2 min-w-0'>
        {Array.from({ length: Math.max(groups, 3) }, (_, index) => (
          <li key={index} className='h-14 bg-white rounded-2xl flex items-center gap-3 pl-11 pr-14'>
            <div className='size-11 shrink-0 rounded-2xl bg-gray-200' />
            <div className='flex-1 space-y-2'>
              <div className='h-3.5 w-32 max-w-full rounded bg-gray-200' />
              <div className='h-2.5 w-20 rounded bg-gray-200' />
            </div>
            <div className='h-3.5 w-20 rounded bg-gray-200' />
          </li>
        ))}
      </ul>
    </div>
  )
}
