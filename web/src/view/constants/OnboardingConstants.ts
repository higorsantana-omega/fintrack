import { OnboardingStep } from '../../app/entities/User'

export const ONBOARDING_STEPS: { key: OnboardingStep, label: string, title: string, help: string }[] = [
  {
    key: 'ACCOUNTS',
    label: 'Contas',
    title: 'Contas e saldos',
    help: 'Cadastre cada conta com o saldo atual copiado do extrato.'
  },
  {
    key: 'CARDS',
    label: 'Cartões',
    title: 'Cartões de crédito',
    help: 'Cadastre cada cartão com o limite, o dia de fechamento e o dia de vencimento.'
  },
  {
    key: 'CARD_ENTRIES',
    label: 'Parcelas e assinaturas',
    title: 'Parcelas, assinaturas e faturas',
    help: 'Adicione as parcelas em andamento e as assinaturas de cada cartão, e informe quanto falta pagar em cada fatura.'
  },
  {
    key: 'BUDGETS',
    label: 'Categorias e limites',
    title: 'Limites por categoria',
    help: 'Defina um limite mensal para os grupos ou subcategorias que quiser acompanhar.'
  },
  {
    key: 'GOALS',
    label: 'Metas',
    title: 'Metas',
    help: 'Crie as metas e escolha a conta de onde sai o dinheiro.'
  },
  {
    key: 'DEBTS',
    label: 'Dívidas',
    title: 'Dívidas e empréstimos',
    help: 'Cadastre o que você deve e quem deve a você.'
  },
  {
    key: 'WISHLIST',
    label: 'Wishlist',
    title: 'Wishlist',
    help: 'Adicione à lista Geral o que você pretende comprar.'
  },
  {
    key: 'REVIEW',
    label: 'Conferir com o banco',
    title: 'Conferir com o banco',
    help: 'Compare os saldos e as faturas abaixo com o app do banco.'
  }
]
