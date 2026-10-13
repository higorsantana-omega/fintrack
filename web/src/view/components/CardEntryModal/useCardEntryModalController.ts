import { useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CardEntry, CreditCard } from '../../../app/entities/CreditCard'
import { useCategories } from '../../../app/hooks/useCategories'
import { cardsService } from '../../../app/services/cardsService'
import { getCardEntryCategories } from '../../../app/utils/cardEntryCategories'
import { currencyStringToNumber } from '../../../app/utils/currencyStringToNumber'
import { formatDate } from '../../../app/utils/formatDate'
import { calendarDateToLocal, positiveCurrency, toCalendarNoonIso } from '../../../app/utils/goalForm'

export const ENTRY_TABS = ['PURCHASE', 'INSTALLMENTS', 'RECURRING', 'REFUND'] as const

export type EntryTab = typeof ENTRY_TABS[number]

// Mirrors the API: an installment purchase has 2 to 48 installments.
const MIN_INSTALLMENTS = 2
const MAX_INSTALLMENTS = 48

const schema = z.object({
  tab: z.enum(ENTRY_TABS),
  cardId: z.string().nonempty('Informe o cartão'),
  description: z.string().nonempty('Informe a descrição'),
  value: positiveCurrency('Informe o valor', 'Informe um valor maior que zero'),
  date: z.date(),
  categoryId: z.string(),
  installmentsCount: z.string(),
  inProgress: z.boolean(),
  currentInstallment: z.string(),
  anchorInvoiceMonth: z.string()
}).superRefine((data, ctx) => {
  if (data.tab !== 'REFUND' && !data.categoryId) {
    ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Informe a categoria' })
  }

  if (data.tab !== 'INSTALLMENTS') return

  const count = Number(data.installmentsCount)
  if (!Number.isInteger(count) || count < MIN_INSTALLMENTS || count > MAX_INSTALLMENTS) {
    ctx.addIssue({
      code: 'custom',
      path: ['installmentsCount'],
      message: `Informe de ${MIN_INSTALLMENTS} a ${MAX_INSTALLMENTS} parcelas`
    })
  }

  const current = Number(data.currentInstallment)
  if (data.inProgress && (!Number.isInteger(current) || current < 1 || current > count)) {
    ctx.addIssue({
      code: 'custom',
      path: ['currentInstallment'],
      message: 'Informe a parcela atual, até o número de parcelas'
    })
  }
})

type FormData = z.infer<typeof schema>

function getEntryTab(entry: CardEntry): EntryTab {
  if (entry.kind === 'REFUND') return 'REFUND'

  return entry.installmentsCount > 1 ? 'INSTALLMENTS' : 'PURCHASE'
}

function getDefaultValues(cards: CreditCard[], cardId?: string, entry?: CardEntry): FormData {
  if (entry) {
    const inProgress = entry.anchorInvoiceMonth !== null

    return {
      tab: getEntryTab(entry),
      cardId: cardId ?? '',
      description: entry.description,
      // In progress, the form edits the installment; otherwise the total.
      value: inProgress ? entry.value : entry.totalValue,
      date: calendarDateToLocal(entry.date),
      categoryId: entry.category?.id ?? '',
      installmentsCount: entry.installmentsCount > 1 ? String(entry.installmentsCount) : '',
      inProgress,
      currentInstallment: inProgress ? String(entry.currentInstallment) : '',
      anchorInvoiceMonth: entry.anchorInvoiceMonth ?? ''
    }
  }

  return {
    tab: 'PURCHASE',
    cardId: cardId ?? (cards.length === 1 ? cards[0].id : ''),
    description: '',
    value: '0,00',
    date: new Date(),
    categoryId: '',
    installmentsCount: '',
    inProgress: false,
    currentInstallment: '',
    anchorInvoiceMonth: ''
  }
}

interface CardEntryModalOptions {
  cards: CreditCard[]
  cardId?: string
  entry?: CardEntry
  onClose(): void
}

export function useCardEntryModalController({ cards, cardId, entry, onClose }: CardEntryModalOptions) {
  const queryClient = useQueryClient()
  const { categories } = useCategories()
  const [limitWarning, setLimitWarning] = useState<number | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const {
    register,
    control,
    setValue,
    setError,
    formState: { errors },
    handleSubmit: hookFormSubmit
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(cards, cardId, entry)
  })

  const [tab, selectedCardId, inProgress, anchorInvoiceMonth] = useWatch({
    control,
    name: ['tab', 'cardId', 'inProgress', 'anchorInvoiceMonth']
  })
  const selectedCard = cards.find(card => card.id === selectedCardId)

  const { isLoading, mutateAsync: save } = useMutation(async (data: FormData) => {
    const value = currencyStringToNumber(data.value)
    const date = toCalendarNoonIso(data.date)
    const categoryId = data.categoryId || undefined
    const installments = data.tab === 'INSTALLMENTS'
      ? {
        installmentsCount: Number(data.installmentsCount),
        currentInstallment: data.inProgress ? Number(data.currentInstallment) : undefined
      }
      : {}

    if (entry) {
      return cardsService.updatePurchase({
        cardId: data.cardId,
        purchaseId: entry.purchaseId!,
        description: data.description,
        categoryId,
        value,
        date,
        ...installments
      })
    }

    if (data.tab === 'RECURRING') {
      return cardsService.createRecurringCharge({
        cardId: data.cardId,
        description: data.description,
        value,
        categoryId: data.categoryId,
        firstChargeDate: date
      })
    }

    return cardsService.createPurchase({
      cardId: data.cardId,
      kind: data.tab === 'REFUND' ? 'REFUND' : 'PURCHASE',
      description: data.description,
      categoryId,
      value,
      date,
      ...installments,
      anchorInvoiceMonth: data.tab === 'INSTALLMENTS' && data.inProgress
        ? data.anchorInvoiceMonth || selectedCard?.openInvoiceMonth
        : undefined
    })
  })

  const { isLoading: isLoadingDelete, mutateAsync: removePurchase } = useMutation(cardsService.removePurchase)

  const handleSubmit = hookFormSubmit(async data => {
    const card = cards.find(({ id }) => id === data.cardId)

    // The first charge cannot fall before the last closed invoice (R19).
    if (data.tab === 'RECURRING' && card && toCalendarNoonIso(data.date) < card.earliestChargeDate) {
      setError('date', {
        message: `A primeira cobrança não pode ser antes de ${formatDate(new Date(card.earliestChargeDate))}`
      })
      return
    }

    try {
      await save(data)
    } catch {
      toast.error(entry ? 'Erro ao salvar o lançamento!' : 'Erro ao registrar o lançamento!')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['cards'] })
    toast.success(entry ? 'Lançamento atualizado!' : 'Lançamento registrado!')

    // A purchase over the limit is accepted, with a warning (R32).
    const updatedCards = await queryClient.fetchQuery({
      queryKey: ['cards', 'list'],
      queryFn: cardsService.getAll
    }).catch(() => [])
    const available = updatedCards.find(({ id }) => id === data.cardId)?.limit.available

    if (available !== undefined && available < 0) {
      setLimitWarning(available)
      return
    }

    onClose()
  })

  async function handleDelete() {
    if (!entry?.purchaseId) return

    try {
      await removePurchase({ cardId: cardId!, purchaseId: entry.purchaseId })

      queryClient.invalidateQueries({ queryKey: ['cards'] })
      toast.success('Lançamento excluído!')
      onClose()
    } catch {
      toast.error('Erro ao excluir o lançamento!')
    }
  }

  return {
    register,
    control,
    errors,
    handleSubmit,
    isLoading,
    tab,
    selectTab: (nextTab: EntryTab) => setValue('tab', nextTab),
    inProgress,
    anchorInvoiceMonth: anchorInvoiceMonth || selectedCard?.openInvoiceMonth,
    selectAnchor: (month: string) => setValue('anchorInvoiceMonth', month),
    selectedCard,
    categories: getCardEntryCategories(categories),
    limitWarning,
    isDeleteModalOpen,
    openDeleteModal: () => setIsDeleteModalOpen(true),
    closeDeleteModal: () => setIsDeleteModalOpen(false),
    handleDelete,
    isLoadingDelete
  }
}
