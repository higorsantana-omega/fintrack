function generateName(tamanho: number) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let name = ''
  for (let i = 0; i < tamanho; i++) {
    name += characters[Math.floor(Math.random() * characters.length)]
  }
  return name
}

function generateEmail() {
  return `${generateName(8)}@example.com`
}

// Currency values are formatted with a non-breaking space after "R$".
function brl(value: string) {
  return new RegExp(`R\\$\\s${value.replace(/\./g, '\\.')}`)
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth()
const daysFromToday = (days: number) => new Date(currentYear, currentMonth, today.getDate() + days, 12)
const monthKeyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const currentMonthKey = monthKeyOf(today)
const nextMonthKey = monthKeyOf(new Date(currentYear, currentMonth + 1, 1))
const currentMonthLabel = `${MONTH_LABELS[currentMonth]}/${currentYear}`
const paymentName = (cardName: string) => `Fatura ${cardName} ${MONTH_NAMES[currentMonth]}`
const lastMonth15th = new Date(currentYear, currentMonth - 1, 15, 12)

function signUp() {
  cy.register('teste', generateEmail(), 'Red@Mod1')
  cy.location('pathname').should('eq', '/')
  cy.get('nav').should('be.visible')
}

// Closes on the 1st and is due on the 10th: anything bought last month falls
// in the invoice due this month, whatever day the test runs.
function monthlyCard(name: string, limit = 10000) {
  return { name, color: '#7950F2', limit, closingDay: 1, dueDay: 10 }
}

// Closed yesterday and due in two days, so its invoice is in reminder.
function closingSoonCard(name: string) {
  return {
    name,
    color: '#7950F2',
    limit: 10000,
    closingDay: daysFromToday(-1).getDate(),
    dueDay: daysFromToday(2).getDate()
  }
}
const closingSoonMonthKey = monthKeyOf(daysFromToday(2))

function purchase(description: string, value: number, date: Date, extra: object = {}) {
  return { kind: 'PURCHASE', description, value, date: date.toISOString(), ...extra }
}

function withCategory(key: string, build: (categoryId: string) => void) {
  cy.apiRequest('GET', '/categories').then(response => {
    const categories = response.body as unknown as { id: string, key: string | null, type: string }[]
    build(categories.find(category => category.key === key && category.type === 'EXPENSE')!.id)
  })
}

// A goal with contribution day 1 that starts on the 1st of the current
// month, so the current month is already pending when it is created.
function pendingGoal(name: string, bankAccountId: string) {
  return {
    name,
    targetAmount: 3000,
    monthlyContribution: 500,
    initialSaved: 0,
    contributionDay: 1,
    startDate: new Date(currentYear, currentMonth, 1, 12).toISOString(),
    endDate: new Date(currentYear + 1, currentMonth, 28, 12).toISOString(),
    bankAccountId
  }
}

function selectOption(id: string, label: string) {
  cy.get(`#${id}`).click()
  cy.get('[role="option"]').contains(label).click()
}

// The date picker opens on the current month.
function pickLastMonthDay(id: string, day: number) {
  cy.get(`#${id}`).click()
  cy.get('button[name="previous-month"]').click()
  cy.get('button[name="day"]').contains(new RegExp(`^${day}$`)).click()
  cy.get(`#${id}`).click()
}

function payFromModal(accountName: string, value?: string) {
  selectOption('paymentBankAccountId', accountName)
  if (value) cy.get('#paymentValue').clear().type(value)
  cy.get('button').contains('Registrar pagamento').click()
  cy.contains('Pagamento registrado!')
}

// Whether an unpaid invoice is in reminder depends on the day the tests run,
// so the reminder modal is dismissed only when the API answered with one.
function visitApp(path: string) {
  // Without If-None-Match the answer is never a bodiless 304.
  cy.intercept('GET', '**/cards/reminders', request => {
    delete request.headers['if-none-match']
  }).as('reminders')
  cy.visit(`http://localhost:5173${path}`)
  cy.wait('@reminders').then(({ response }) => {
    if (response?.body.length) cy.get('#invoice-reminder-later').click()
  })
}

function openCard(cardId: string) {
  visitApp(`/cartoes/${cardId}`)
  cy.get('#card-name').should('be.visible')
}

function selectInvoice(month: string) {
  cy.get(`#invoice-strip [data-month="${month}"]`).click()
  cy.get(`#invoice-strip [data-month="${month}"]`).should('have.attr', 'aria-pressed', 'true')
}

describe('Cartões', () => {
  it('registers a card in use and brings a purchase and an installment purchase in progress, showing the invoice of the month and the available limit (F1)', () => {
    signUp()
    cy.visit('http://localhost:5173/cartoes')

    cy.get('#cards-new-card').click()
    cy.get('#cardLimit').clear().type('5000')
    cy.get('#name').type('Nubank')
    cy.get('#closingDay').type('1')
    cy.get('#dueDay').type('10')
    cy.get('[role="dialog"] button').contains('Cor').click()
    cy.get('[role="menuitem"]').first().click()
    cy.get('button').contains('Cadastrar cartão').click()
    cy.contains('Cartão cadastrado com sucesso!')

    cy.get('#cards-new-entry').click()
    cy.get('#entryValue').clear().type('100')
    cy.get('#entryDescription').type('Mercado')
    pickLastMonthDay('entryDate', 15)
    selectOption('entryCategoryId', 'Supermercado')
    cy.get('#entrySubmit').click()
    cy.contains('Lançamento registrado!')

    cy.get('#cards-new-entry').click()
    cy.contains('[role="tab"]', 'Parcelada').click()
    cy.get('#entryInProgress').check()
    cy.get('#entryValue').clear().type('400')
    cy.get('#entryDescription').type('Notebook')
    cy.get('#entryInstallmentsCount').type('10')
    cy.get('#entryCurrentInstallment').type('4')
    cy.get('[role="radio"][aria-checked="true"]').should('contain', '(aberta)')
    selectOption('entryCategoryId', 'Educação')
    cy.get('#entrySubmit').click()
    cy.contains('Lançamento registrado!')

    cy.get('a[data-card-name="Nubank"]').should('contain', `Fatura de ${currentMonthLabel}`)
    cy.get('a[data-card-name="Nubank"] .card-invoice').invoke('text').should('match', brl('100,00'))
    cy.get('a[data-card-name="Nubank"] .card-available').invoke('text').should('match', brl('2.100,00'))
  })

  it('keeps card purchases out of the Dashboard and of the account balance (R37)', () => {
    signUp()
    cy.createBankAccount('Itaú', 1000)
    cy.createCard(monthlyCard('Nubank')).then(cardId => {
      withCategory('food', categoryId => {
        cy.createCardPurchase(cardId, purchase('Compra no cartão', 300, today, { categoryId }))
      })
    })

    cy.visit('http://localhost:5173/')
    cy.contains('[role="button"]', 'Itaú').invoke('text').should('match', brl('1.000,00'))
    cy.contains('Nao encontramos nenhuma transacao!')
    cy.contains('Compra no cartão').should('not.exist')
  })

  it('adds an installment purchase recorded from the Cartões page, choosing the card, to the invoices of the month', () => {
    signUp()
    cy.createCard(monthlyCard('Nubank'))
    cy.createCard(monthlyCard('Inter'))

    cy.visit('http://localhost:5173/cartoes')
    cy.get('#summary-invoices').invoke('text').should('match', brl('0,00'))

    cy.get('#cards-new-entry').click()
    cy.contains('[role="tab"]', 'Parcelada').click()
    cy.get('#entryValue').clear().type('300')
    selectOption('entryCardId', 'Inter')
    cy.get('#entryDescription').type('Tênis')
    cy.get('#entryInstallmentsCount').type('2')
    pickLastMonthDay('entryDate', 15)
    selectOption('entryCategoryId', 'Roupas')
    cy.get('#entrySubmit').click()
    cy.contains('Lançamento registrado!')

    cy.get('#summary-invoices').invoke('text').should('match', brl('150,00'))
    cy.get('a[data-card-name="Inter"] .card-invoice').invoke('text').should('match', brl('150,00'))
    cy.get('a[data-card-name="Nubank"] .card-invoice').invoke('text').should('match', brl('0,00'))
  })

  it('warns and records a purchase above the available limit (R32, AE9)', () => {
    signUp()
    cy.createCard(monthlyCard('Nubank', 100))

    cy.visit('http://localhost:5173/cartoes')
    cy.get('#cards-new-entry').click()
    cy.get('#entryValue').clear().type('150')
    cy.get('#entryDescription').type('Jantar')
    selectOption('entryCategoryId', 'Alimentação')
    cy.get('#entrySubmit').click()

    cy.get('#limit-warning').invoke('text').should('match', /-R\$\s50,00/)
    cy.get('button').contains('Entendi').click()
    cy.get('a[data-card-name="Nubank"] .card-available').invoke('text').should('match', /-R\$\s50,00/)
  })

  it('charts 13 months and marks future invoices (R41)', () => {
    signUp()
    cy.createCard(monthlyCard('Nubank')).then(cardId => {
      withCategory('tourism', categoryId => {
        cy.createCardPurchase(cardId, purchase('Viagem', 600, lastMonth15th, { categoryId, installmentsCount: 6 }))
      })
    })

    visitApp('/cartoes')
    cy.get('.recharts-bar-rectangle').should('have.length', 13)
    cy.get('.recharts-bar-rectangle path[data-future="false"]').should('exist')
    cy.get('.recharts-bar-rectangle path[data-future="true"]').should('exist')
  })

  it('shows the installments 1/2 and 2/2 in consecutive blocks and sums the category of the selected invoice', () => {
    signUp()
    cy.createCard(monthlyCard('Nubank')).then(openCard)

    cy.get('#card-action-entry').click()
    cy.contains('[role="tab"]', 'Parcelada').click()
    cy.get('#entryValue').clear().type('200')
    cy.get('#entryDescription').type('Fone')
    cy.get('#entryInstallmentsCount').type('2')
    pickLastMonthDay('entryDate', 15)
    selectOption('entryCategoryId', 'Lazer')
    cy.get('#entrySubmit').click()
    cy.contains('Lançamento registrado!')

    selectInvoice(currentMonthKey)
    cy.contains('.invoice-entry', 'Fone').find('.entry-mark').should('have.text', '1/2')
    selectInvoice(nextMonthKey)
    cy.contains('.invoice-entry', 'Fone').find('.entry-mark').should('have.text', '2/2')

    cy.contains('[role="tab"]', 'Categorias').click()
    cy.get('#invoice-categories .category-name').should('have.text', 'Lazer')
    cy.get('#invoice-categories .category-total').invoke('text').should('match', brl('100,00'))
  })

  it('opens the card page on a closed invoice with a balance (R44)', () => {
    signUp()
    cy.createCard(closingSoonCard('Nubank')).then(cardId => {
      withCategory('food', categoryId => {
        cy.createCardPurchase(cardId, purchase('Mercado', 80, daysFromToday(-3), { categoryId }))
      })
      cy.visit(`http://localhost:5173/cartoes/${cardId}`)
    })

    cy.get('#invoice-reminder-later').click()
    cy.get('#invoice-strip [aria-pressed="true"]').should('have.attr', 'data-month', closingSoonMonthKey)
    cy.get('#invoice-status').should('have.text', 'Fechada')
    cy.get('#invoice-balance').invoke('text').should('match', brl('80,00'))
  })

  it('keeps the invoice paid when the payment category changes on the Dashboard (AE16)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createCard(monthlyCard('Nubank')).then(cardId => {
        withCategory('supermarket', categoryId => {
          cy.createCardPurchase(cardId, purchase('Feira', 100, lastMonth15th, { categoryId }))
        })
        cy.payInvoice(cardId, currentMonthKey, { bankAccountId: accountId, value: 100, date: today.toISOString() })

        cy.visit('http://localhost:5173/')
        cy.contains('[role="button"]', paymentName('Nubank')).click()
        cy.get('[role="dialog"] button[role="combobox"]').first().click()
        cy.contains('[role="option"]', /^Outros$/).click()
        cy.get('button').contains('Salvar').click()
        cy.contains('Despesa editada com sucesso!')

        openCard(cardId)
        selectInvoice(currentMonthKey)
        cy.get('#invoice-status').should('have.text', 'Paga')
        cy.get('#invoice-pay').should('not.exist')
      })
    })
  })

  it('brings the balance and Pagar back when the payment is deleted on the Dashboard (R29)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createCard(monthlyCard('Nubank')).then(cardId => {
        withCategory('supermarket', categoryId => {
          cy.createCardPurchase(cardId, purchase('Feira', 100, lastMonth15th, { categoryId }))
        })
        cy.payInvoice(cardId, currentMonthKey, { bankAccountId: accountId, value: 100, date: today.toISOString() })

        cy.visit('http://localhost:5173/')
        cy.contains('[role="button"]', paymentName('Nubank')).click()
        cy.get('[role="dialog"] header button').last().click()
        cy.get('button').contains('Sim, desejo excluir').click()
        cy.contains('[role="button"]', paymentName('Nubank')).should('not.exist')

        openCard(cardId)
        selectInvoice(currentMonthKey)
        cy.get('#invoice-balance').invoke('text').should('match', brl('100,00'))
        cy.get('#invoice-pay').should('be.visible')
      })
    })
  })

  it('takes a cancelled recurring charge out of the active list (R22, R46)', () => {
    signUp()
    cy.createCard(monthlyCard('Nubank')).then(cardId => {
      withCategory('leisure', categoryId => {
        cy.apiRequest('POST', `/cards/${cardId}/recurring-charges`, {
          description: 'Netflix',
          value: 55,
          categoryId,
          firstChargeDate: daysFromToday(3).toISOString()
        }).its('status').should('eq', 201)
      })
      openCard(cardId)
    })

    cy.contains('.recurring-charge', 'Netflix').contains('Cancelar').click()
    cy.get('#cancel-recurring-confirm').click()
    cy.contains('Recorrente cancelada!')
    cy.contains('Nenhuma recorrente ativa.')
  })

  it('refuses to archive a card with future installments, telling what it owes, and archives one without debt as read-only (AE12)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createCard(monthlyCard('Nubank')).then(cardId => {
        withCategory('leisure', categoryId => {
          cy.createCardPurchase(cardId, purchase('TV', 900, today, { categoryId, installmentsCount: 3 }))
        })
        openCard(cardId)
        cy.get('#card-action-archive').click()
        cy.contains(/O cartão ainda deve R\$\s900,00/)
        cy.get('#card-archived').should('not.exist')
      })

      cy.createCard(monthlyCard('Antigo')).then(cardId => {
        withCategory('leisure', categoryId => {
          cy.createCardPurchase(cardId, purchase('Cinema', 50, lastMonth15th, { categoryId }))
        })
        cy.payInvoice(cardId, currentMonthKey, { bankAccountId: accountId, value: 50, date: today.toISOString() })
        openCard(cardId)
        cy.get('#card-action-archive').click()
        cy.contains('Cartão arquivado!')
        cy.get('#card-archived').should('be.visible')
        cy.get('#card-action-edit').should('not.exist')
        cy.get('#card-action-entry').should('not.exist')
      })
    })

    visitApp('/cartoes')
    cy.get('#cards-archived').should('contain', 'Antigo')
    cy.get('#cards-active').should('contain', 'Nubank')
  })

  it('shows the reminder of a closed invoice due within 5 days, keeps the banner and the menu dot after "Depois", and drops both once paid (AE10)', () => {
    signUp()
    cy.createBankAccount('Itaú')
    cy.createCard(closingSoonCard('Nubank')).then(cardId => {
      withCategory('food', categoryId => {
        cy.createCardPurchase(cardId, purchase('Mercado', 1230, daysFromToday(-3), { categoryId }))
      })
    })

    cy.reload()
    cy.get('#invoice-reminder-card').should('have.text', 'Nubank')
    cy.get('#invoice-reminder-later').click()
    cy.get('#invoice-reminder-card').should('not.exist')
    cy.get('#invoice-reminder-banner').should('be.visible')
    cy.get('#cards-nav-dot').should('exist')

    cy.get('nav').contains('Metas').click()
    cy.get('#invoice-reminder-banner').should('be.visible')

    cy.get('#invoice-reminder-banner-pay').click()
    payFromModal('Itaú', '1000')
    cy.get('#invoice-reminder-banner-balance').invoke('text').should('match', brl('230,00'))

    cy.get('#invoice-reminder-banner-pay').click()
    payFromModal('Itaú')
    cy.get('#invoice-reminder-banner').should('not.exist')
    cy.get('#cards-nav-dot').should('not.exist')
  })

  it('does not bring the reminder back after a partial "Pagar agora", and the banner shows the rest (AE15)', () => {
    signUp()
    cy.createBankAccount('Itaú')
    cy.createCard(closingSoonCard('Nubank')).then(cardId => {
      withCategory('food', categoryId => {
        cy.createCardPurchase(cardId, purchase('Mercado', 1230, daysFromToday(-3), { categoryId }))
      })
    })

    cy.reload()
    cy.get('#invoice-reminder-pay').click()
    payFromModal('Itaú', '1000')
    cy.get('#invoice-reminder-card').should('not.exist')
    cy.get('#invoice-reminder-banner-balance').invoke('text').should('match', brl('230,00'))
  })

  it('goes back to the reminder when the payment opened by "Pagar agora" is cancelled', () => {
    signUp()
    cy.createBankAccount('Itaú')
    cy.createCard(closingSoonCard('Nubank')).then(cardId => {
      withCategory('food', categoryId => {
        cy.createCardPurchase(cardId, purchase('Mercado', 80, daysFromToday(-3), { categoryId }))
      })
    })

    cy.reload()
    cy.get('#invoice-reminder-pay').click()
    cy.get('#pay-invoice-title').should('be.visible')
    cy.get('[role="dialog"] header button').first().click()
    cy.get('#pay-invoice-title').should('not.exist')
    cy.get('#invoice-reminder-card').should('have.text', 'Nubank')
  })

  it('shows the invoice reminder before the goal reminder, which follows "Depois" (R34, R35)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createGoal(pendingGoal('Reserva', accountId))
    })
    cy.createCard(closingSoonCard('Nubank')).then(cardId => {
      withCategory('food', categoryId => {
        cy.createCardPurchase(cardId, purchase('Mercado', 80, daysFromToday(-3), { categoryId }))
      })
    })

    cy.reload()
    cy.get('#invoice-reminder-card').should('have.text', 'Nubank')
    cy.get('#reminder-goal').should('not.exist')
    cy.get('#invoice-reminder-later').click()
    cy.get('#reminder-goal').should('have.text', 'Reserva')
  })

  it('keeps the goal reminders as they were, without banner or dot, when no invoice is in reminder', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createGoal(pendingGoal('Reserva', accountId))
    })
    cy.createCard(monthlyCard('Nubank'))

    cy.reload()
    cy.get('#reminder-goal').should('have.text', 'Reserva')
    cy.get('#invoice-reminder-banner').should('not.exist')
    cy.get('#cards-nav-dot').should('not.exist')
  })

  it('pays part of an invoice from one account and the rest from another, and the Dashboard shows both expenses (AE4)', () => {
    signUp()
    cy.createBankAccount('Itaú')
    cy.createBankAccount('Inter')
    cy.createCard(monthlyCard('Nubank')).then(cardId => {
      withCategory('food', categoryId => {
        cy.createCardPurchase(cardId, purchase('Mercado', 1230, lastMonth15th, { categoryId }))
      })
      openCard(cardId)
    })

    cy.get('#invoice-strip [aria-pressed="true"]').should('have.attr', 'data-month', currentMonthKey)
    cy.get('#invoice-pay').click()
    payFromModal('Itaú', '1000')
    cy.get('#invoice-balance').invoke('text').should('match', brl('230,00'))

    cy.get('#invoice-pay').click()
    cy.get('#paymentValue').should('have.value', '230')
    payFromModal('Inter')
    cy.get('#invoice-status').should('have.text', 'Paga')
    cy.get('#invoice-payments li').should('have.length', 2)

    cy.get('nav').contains('Dashboard').click()
    cy.get('[role="button"]').filter(`:contains("${paymentName('Nubank')}")`).should('have.length', 2)
  })

  it('leaves "Fatura de cartão" out of the categories of a new Dashboard expense (R49)', () => {
    signUp()
    cy.createBankAccount('Itaú')

    cy.get('.fixed.right-4.bottom-4 button').click()
    cy.get('[role="menuitem"]').contains('Nova despesa').click()
    cy.get('[role="dialog"] button[role="combobox"]').first().click()
    cy.get('[role="option"]').contains('Alimentação')
    cy.get('[role="option"]').contains('Fatura de cartão').should('not.exist')
  })

  it('lists the invoices an account deletion reopens; Cancel keeps the account and confirming reopens them (AE11)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createCard(monthlyCard('Nubank')).then(cardId => {
        withCategory('food', categoryId => {
          cy.createCardPurchase(cardId, purchase('Mercado', 100, lastMonth15th, { categoryId }))
        })
        cy.payInvoice(cardId, currentMonthKey, { bankAccountId: accountId, value: 100, date: today.toISOString() })

        cy.visit('http://localhost:5173/')
        cy.contains('[role="button"]', 'Itaú').click()
        cy.get('[role="dialog"] header button').last().click()
        cy.get('button').contains('Sim, desejo excluir').click()
        cy.get('#reopened-invoices').should('contain', `Fatura Nubank ${currentMonthLabel}`)

        cy.get('button').contains('Cancelar').click()
        cy.get('#reopened-invoices').should('not.exist')
        cy.get('[role="dialog"] header button').first().click()
        cy.contains('[role="button"]', 'Itaú').should('exist')

        cy.contains('[role="button"]', 'Itaú').click()
        cy.get('[role="dialog"] header button').last().click()
        cy.get('button').contains('Sim, desejo excluir').click()
        cy.get('#reopened-invoices').should('be.visible')
        cy.get('button').contains('Sim, desejo excluir').click()
        cy.contains('Conta deletada com sucesso.')
        cy.contains('[role="button"]', 'Itaú').should('not.exist')

        openCard(cardId)
        selectInvoice(currentMonthKey)
        cy.get('#invoice-balance').invoke('text').should('match', brl('100,00'))
        cy.get('#invoice-pay').should('be.visible')
      })
    })
  })

  it('still warns about goals when deleting an account linked to a goal', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createGoal(pendingGoal('Faculdade', accountId))
    })

    cy.visit('http://localhost:5173/')
    cy.get('#reminder-goal').should('be.visible')
    cy.get('[role="dialog"] header button').first().click()
    cy.contains('[role="button"]', 'Itaú').click()
    cy.get('[role="dialog"] header button').last().click()
    cy.get('button').contains('Sim, desejo excluir').click()
    cy.contains('Esta conta está ligada às metas: Faculdade.')
    cy.get('#reopened-invoices').should('not.exist')
  })
})
