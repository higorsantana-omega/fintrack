import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Category, categoriesService } from '../../../../../app/services/categoriesService'
import { CategoryFormData, getCategoryFormSchema, getSiblingNames } from '../../../../../app/utils/categoryForm'
import { getApiErrorPayload } from '../../../../../app/utils/getApiErrorPayload'
import { invalidateMoneyQueries } from '../../../../../app/utils/invalidateMoneyQueries'

export type CategoryFormTarget =
  | { kind: 'createGroup', type: Category['type'] }
  | { kind: 'createSubcategory', parent: Category }
  | { kind: 'edit', category: Category }

const TITLES: Record<CategoryFormTarget['kind'], string> = {
  createGroup: 'Novo grupo',
  createSubcategory: 'Nova subcategoria',
  edit: 'Editar categoria'
}

export function useCategoryFormModalController(target: CategoryFormTarget, categories: Category[], onClose: () => void) {
  const editing = target.kind === 'edit' ? target.category : null
  const isGroup = target.kind === 'createGroup' || (editing !== null && editing.parentId === null)

  const schema = useMemo(() => {
    const names = target.kind === 'createGroup'
      ? getSiblingNames(categories, { type: target.type, parentId: null })
      : target.kind === 'createSubcategory'
        ? getSiblingNames(categories, { type: target.parent.type, parentId: target.parent.id })
        : getSiblingNames(categories, { type: target.category.type, parentId: target.category.parentId, excludeId: target.category.id })

    return getCategoryFormSchema(names, isGroup)
  }, [target, categories, isGroup])

  const {
    register,
    control,
    formState: { errors },
    handleSubmit: hookFormSubmit
  } = useForm<CategoryFormData>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { name: editing.name, icon: editing.icon ?? undefined, color: editing.color ?? undefined }
      : undefined
  })

  const color = useWatch({ control, name: 'color' })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(async (data: CategoryFormData) => {
    if (editing) {
      return categoriesService.update({ id: editing.id, ...data })
    }

    if (target.kind === 'createSubcategory') {
      return categoriesService.create({ name: data.name, parentId: target.parent.id })
    }

    return categoriesService.create({
      name: data.name,
      type: (target as { type: Category['type'] }).type,
      icon: data.icon as string,
      color: data.color as string
    })
  })

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync(data)

      await invalidateMoneyQueries(queryClient)
      toast.success(editing ? 'Categoria atualizada!' : 'Categoria criada!')
      onClose()
    } catch (error) {
      toast.error(getApiErrorPayload(error).status === 409
        ? 'Já existe uma categoria com esse nome.'
        : 'Erro ao salvar a categoria!')
    }
  })

  return { title: TITLES[target.kind], isGroup, color, register, control, errors, handleSubmit, isLoading }
}
