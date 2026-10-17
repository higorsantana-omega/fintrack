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

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth()
const daysFromToday = (days: number) => new Date(currentYear, currentMonth, today.getDate() + days, 12)
const monthAt = (offset: number) => new Date(currentYear, currentMonth + offset, 1)
const monthKeyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const monthLabelOf = (date: Date) => `${MONTH_LABELS[date.getMonth()]}/${date.getFullYear()}`
const noonUtc = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString()

function signUp() {
  cy.register('teste', generateEmail(), 'Red@Mod1')
  cy.location('pathname').should('eq', '/')
  cy.get('nav').should('be.visible')
}

// 48 installments of R$ 1.200 due on the 10th. Installment 19 falls last
// month and 20 this month, so 19 is overdue on any day of the month and
// both are the ones "Atrasadas + a do mês" marks. 21 falls next month, more
// than 5 days away, so it stays out of the reminders. 36.000 left, ending
// 28 months from now.
function carDebt() {
  return {
    name: 'Carro',
    installmentValue: 1200,
    installmentsCount: 48,
    dueDay: 10,
    nextInstallment: 19,
    nextInstallmentMonth: monthKeyOf(monthAt(-1))
  }
}

// One installment due in `days` days, so it is in reminder; the rest is a
// month or more away.
function dueSoonDebt(name: string, days: number, installmentValue = 1200) {
  const dueDate = daysFromToday(days)

  return {
    name,
    installmentValue,
    installmentsCount: 3,
    dueDay: dueDate.getDate(),
    nextInstallment: 1,
    nextInstallmentMonth: monthKeyOf(dueDate)
  }
}

function payment(installmentNumbers: number[], bankAccountId: string, value: number) {
  return { installmentNumbers, bankAccountId, value, date: noonUtc(today) }
}

function movement(kind: 'LEND' | 'RETURN', bankAccountId: string, value: number) {
  return { kind, bankAccountId, value, date: noonUtc(today) }
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

function withCategory(icon: string, build: (categoryId: string) => void) {
  cy.apiRequest('GET', '/categories').then(response => {
    const categories = response.body as unknown as { id: string, icon: string, type: string }[]
    build(categories.find(category => category.icon === icon && category.type === 'EXPENSE')!.id)
  })
}

function selectOption(id: string, label: string) {
  cy.get(`#${id}`).click()
  cy.get('[role="option"]').contains(label).click()
}

// Whether a debt or an invoice is in reminder depends on the day the tests
// run, so each modal is dismissed only when the API answered with one.
function visitApp(path: string) {
  // Without If-None-Match the answer is never a bodiless 304.
  const dropEtag = (request: { headers: Record<string, unknown> }) => {
    delete request.headers['if-none-match']
  }
  cy.intercept('GET', '**/cards/reminders', dropEtag).as('invoiceReminders')
  cy.intercept('GET', '**/debts/reminders', dropEtag).as('debtReminders')
  cy.visit(`http://localhost:5173${path}`)
  cy.wait('@invoiceReminders').then(({ response }) => {
    if (response?.body.length) cy.get('#invoice-reminder-later').click()
  })
  cy.wait('@debtReminders').then(({ response }) => {
    if (response?.body.length) cy.get('#debt-reminder-later').click()
  })
}

function openDebt(debtId: string) {
  visitApp(`/dividas/${debtId}`)
  cy.get('#debt-name').should('be.visible')
}

function openBorrower(borrowerId: string) {
  visitApp(`/dividas/pessoas/${borrowerId}`)
  cy.get('#borrower-name').should('be.visible')
}

function confirmPayment(accountName: string, value?: string) {
  selectOption('pay-debt-bank-account', accountName)
  if (value) cy.get('#pay-debt-value').clear().type(value)
  cy.get('#pay-debt-confirm').click()
  cy.contains('Pagamento registrado!')
}

function openDashboardEntry(name: string) {
  cy.contains('[role="button"]', name).click()
}

function deleteOpenEntry() {
  cy.get('[role="dialog"] header button').last().click()
  cy.get('button').contains('Sim, desejo excluir').click()
}

describe('Dívidas', () => {
  it('registers a debt in progress with the previous installments paid before the app, creating no transaction (F1)', () => {
    signUp()

    visitApp('/dividas')
    cy.get('#debts-empty').should('be.visible')
    cy.get('#debts-new-debt').click()
    cy.get('#debtInstallmentValue').clear().type('1200')
    cy.get('#debtName').type('Carro')
    cy.get('#debtInstallmentsCount').type('48')
    cy.get('#debtDueDay').type('10')
    cy.get('#debtNextInstallment').clear().type('19')
    cy.get('#debtNextInstallmentMonth').type(monthKeyOf(monthAt(-1)))
    cy.get('#debtHasEntry').should('not.be.checked')
    cy.get('#debtSubmit').click()
    cy.contains('Dívida cadastrada com sucesso!')

    cy.get('a[data-debt-name="Carro"] .debt-paid').should('have.text', '18/48')
    cy.get('a[data-debt-name="Carro"] .debt-remaining').invoke('text').should('match', brl('36.000,00'))
    cy.get('#summary-total-owed').invoke('text').should('match', brl('36.000,00'))
    cy.get('#summary-ends-in').should('have.text', monthLabelOf(monthAt(28)))

    cy.get('a[data-debt-name="Carro"]').click()
    cy.get('#debt-ends-in').should('have.text', monthLabelOf(monthAt(28)))
    cy.get('#debt-paid').should('have.text', '18/48')

    cy.get('nav').contains('Dashboard').click()
    cy.contains('Nao encontramos nenhuma transacao!')
  })

  it('pays the overdue installments and the one of the month with a fine as a single expense, and the remaining amount drops by the expected sum (AE2)', () => {
    signUp()
    cy.createBankAccount('Itaú')
    cy.createDebt(carDebt()).then(openDebt)

    cy.get('#debt-status').should('have.text', 'Atrasada')
    cy.get('#debt-remaining').invoke('text').should('match', brl('36.000,00'))

    cy.get('#debt-action-pay').click()
    cy.get('#pay-debt-shortcut-overdue').click()
    cy.get('#pay-debt-installment-19').should('be.checked')
    cy.get('#pay-debt-installment-20').should('be.checked')
    cy.get('#pay-debt-expected').invoke('text').should('match', brl('2.400,00'))
    confirmPayment('Itaú', '2450')

    cy.get('#debt-remaining').invoke('text').should('match', brl('33.600,00'))
    cy.get('#debt-status').should('have.text', 'Em andamento')
    cy.get('#debt-paid').should('have.text', '20/48')

    cy.get('nav').contains('Dashboard').click()
    cy.get('[role="button"]').filter(':contains("Carro")').should('have.length', 1)
    cy.contains('[role="button"]', 'Carro').invoke('text').should('match', brl('2.450,00'))
  })

  it('shortens "termina em" when the last 3 installments are paid (AE3)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(itauId => {
      cy.createBankAccount('Inter')
      cy.createDebt(carDebt()).then(debtId => {
        cy.payDebt(debtId, payment([19, 20], itauId, 2450))
        openDebt(debtId)
      })
    })

    cy.get('#debt-remaining').invoke('text').should('match', brl('33.600,00'))
    cy.get('#debt-ends-in').should('have.text', monthLabelOf(monthAt(28)))

    cy.get('#debt-action-pay').click()
    cy.get('#pay-debt-last-count').clear().type('3')
    cy.get('#pay-debt-shortcut-last').click()
    cy.get('#pay-debt-installment-46').should('be.checked')
    cy.get('#pay-debt-installment-48').should('be.checked')
    cy.get('#pay-debt-expected').invoke('text').should('match', brl('3.600,00'))
    confirmPayment('Inter', '3000')

    cy.get('#debt-remaining').invoke('text').should('match', brl('30.000,00'))
    cy.get('#debt-ends-in').should('have.text', monthLabelOf(monthAt(25)))
  })

  it('moves the debt to Quitadas when all the installments are paid with a lower value (AE4)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(itauId => {
      cy.createBankAccount('Inter').then(interId => {
        cy.createDebt(carDebt()).then(debtId => {
          cy.payDebt(debtId, payment([19, 20], itauId, 2450))
          cy.payDebt(debtId, payment([46, 47, 48], interId, 3000))
          openDebt(debtId)
        })
      })
    })

    cy.get('#debt-remaining').invoke('text').should('match', brl('30.000,00'))
    cy.get('#debt-action-pay').click()
    cy.get('#pay-debt-shortcut-all').click()
    cy.get('#pay-debt-expected').invoke('text').should('match', brl('30.000,00'))
    confirmPayment('Itaú', '24000')

    cy.get('#debt-status').should('have.text', 'Quitada')
    cy.get('#debt-remaining').invoke('text').should('match', brl('0,00'))
    cy.get('#debt-action-pay').should('not.exist')

    cy.get('nav').contains('Dívidas').click()
    cy.get('#debts-paid a[data-debt-name="Carro"]').should('exist')
    cy.get('#debts-open').should('not.exist')
    cy.get('#debt-reminder-banner').should('not.exist')
    cy.get('#debts-nav-dot').should('not.exist')
  })

  it('reopens the installments and brings the debt back to Atrasada when the payment is deleted on the Dashboard (AE7)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(itauId => {
      cy.createDebt(carDebt()).then(debtId => {
        cy.payDebt(debtId, payment([19, 20], itauId, 2450))

        visitApp('/')
        openDashboardEntry('Carro')
        deleteOpenEntry()
        cy.contains('[role="button"]', 'Carro').should('not.exist')

        openDebt(debtId)
      })
    })

    cy.get('#debt-remaining').invoke('text').should('match', brl('36.000,00'))
    cy.get('#debt-status').should('have.text', 'Atrasada')
    cy.get('#debt-paid').should('have.text', '18/48')
    cy.get('#debt-reminder-banner').should('be.visible')
    cy.get('#debts-nav-dot').should('exist')
  })

  it('shows the debt reminder after the invoice one and before the goal one; "Depois" keeps the banner and the menu dot until the installment is paid (AE6)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createGoal(pendingGoal('Reserva', accountId))
    })
    cy.createCard(closingSoonCard('Nubank')).then(cardId => {
      withCategory('food', categoryId => {
        cy.createCardPurchase(cardId, {
          kind: 'PURCHASE',
          description: 'Mercado',
          value: 80,
          date: daysFromToday(-3).toISOString(),
          categoryId
        })
      })
    })
    cy.createDebt(dueSoonDebt('Carro', 2))

    cy.reload()
    cy.get('#invoice-reminder-card').should('have.text', 'Nubank')
    cy.get('#debt-reminder-name').should('not.exist')
    cy.get('#reminder-goal').should('not.exist')

    cy.get('#invoice-reminder-later').click()
    cy.get('#debt-reminder-name').should('have.text', 'Carro')
    cy.get('#reminder-goal').should('not.exist')

    cy.get('#debt-reminder-later').click()
    cy.get('#debt-reminder-name').should('not.exist')
    cy.get('#reminder-goal').should('have.text', 'Reserva')
    cy.get('#debt-reminder-banner').should('be.visible')
    cy.get('#debts-nav-dot').should('exist')

    cy.get('[role="dialog"] header button').first().click()
    cy.get('nav').contains('Metas').click()
    cy.get('#debt-reminder-banner').should('be.visible')

    cy.get('#debt-reminder-banner-pay').click()
    cy.get('#pay-debt-installment-1').should('be.checked')
    confirmPayment('Itaú')
    cy.get('#debt-reminder-banner').should('not.exist')
    cy.get('#debts-nav-dot').should('not.exist')
  })

  it('opens Pagar with the installment due within 5 days already marked by "Pagar agora" (AE14)', () => {
    signUp()
    cy.createBankAccount('Itaú')
    cy.createDebt(dueSoonDebt('Moto', 3, 800))

    cy.reload()
    cy.get('#debt-reminder-name').should('have.text', 'Moto')
    cy.get('#debt-reminder-pay').click()

    cy.get('#pay-debt-title').should('have.text', 'Moto')
    cy.get('#pay-debt-installment-1').should('be.checked')
    cy.get('#pay-debt-expected').invoke('text').should('match', brl('800,00'))
    cy.get('#pay-debt-value').should('have.value', '800')
  })

  it('does not hold the goal reminders when no debt is in reminder', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createGoal(pendingGoal('Reserva', accountId))
    })
    cy.createDebt({ ...carDebt(), nextInstallment: 1, nextInstallmentMonth: monthKeyOf(monthAt(2)) })

    cy.reload()
    cy.get('#reminder-goal').should('have.text', 'Reserva')
    cy.get('#debt-reminder-name').should('not.exist')
    cy.get('#debt-reminder-banner').should('not.exist')
    cy.get('#debts-nav-dot').should('not.exist')
  })

  it('follows the balance of João after a loan and a return, and refuses a return above the balance showing the maximum (F4, AE8)', () => {
    signUp()
    cy.createBankAccount('Itaú')
    cy.createBankAccount('Inter')

    visitApp('/dividas')
    cy.get('#debts-tab-owed').click()
    cy.get('#borrowers-empty').should('be.visible')
    cy.get('#debts-new-borrower').click()
    cy.get('#borrowerOpeningBalance').clear().type('1500')
    cy.get('#borrowerName').type('João')
    cy.get('#borrowerSubmit').click()
    cy.contains('Pessoa cadastrada com sucesso!')
    cy.get('#summary-owed-by-people').invoke('text').should('match', brl('1.500,00'))

    cy.get('a[data-borrower-name="João"]').click()
    cy.get('#borrower-balance').invoke('text').should('match', brl('1.500,00'))

    cy.get('#borrower-action-lend').click()
    cy.get('#borrower-movement-value').clear().type('500')
    selectOption('borrower-movement-bank-account', 'Inter')
    cy.get('#borrower-movement-confirm').click()
    cy.contains('Empréstimo registrado!')
    cy.get('#borrower-balance').invoke('text').should('match', brl('2.000,00'))

    cy.get('#borrower-action-return').click()
    cy.get('#borrower-movement-value').clear().type('300')
    selectOption('borrower-movement-bank-account', 'Itaú')
    cy.get('#borrower-movement-confirm').click()
    cy.contains('Devolução registrada!')
    cy.get('#borrower-balance').invoke('text').should('match', brl('1.700,00'))
    cy.get('.borrower-movement').should('have.length', 2)

    cy.get('#borrower-action-return').click()
    cy.get('#borrower-movement-value').clear().type('2000')
    selectOption('borrower-movement-bank-account', 'Itaú')
    cy.get('#borrower-movement-confirm').click()
    cy.contains(/O máximo é R\$\s1\.700,00/)
    cy.get('[role="dialog"] header button').first().click()
    cy.get('#borrower-balance').invoke('text').should('match', brl('1.700,00'))

    cy.get('nav').contains('Dashboard').click()
    cy.contains('[role="button"]', 'Empréstimo: João').invoke('text').should('match', brl('500,00'))
    cy.contains('[role="button"]', 'Devolução: João').invoke('text').should('match', brl('300,00'))
    cy.contains('[role="button"]', 'Inter').invoke('text').should('match', brl('500,00'))
    cy.contains('[role="button"]', 'Itaú').invoke('text').should('match', brl('1.300,00'))
  })

  it('lists the installments and the balance an account deletion changes, and confirming reopens the installments (AE11)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(itauId => {
      cy.createBankAccount('Inter').then(interId => {
        cy.createDebt(carDebt()).then(debtId => {
          cy.payDebt(debtId, payment([19, 20], itauId, 2450))

          cy.createBorrower({ name: 'João', openingBalance: 1500 }).then(borrowerId => {
            cy.createBorrowerMovement(borrowerId, movement('LEND', interId, 500))
            cy.createBorrowerMovement(borrowerId, movement('RETURN', itauId, 300))

            visitApp('/')
            cy.contains('[role="button"]', 'Itaú').click()
            cy.get('[role="dialog"] header button').last().click()
            cy.get('button').contains('Sim, desejo excluir').click()
            cy.get('#reopened-debts').invoke('text')
              .should('match', /Carro: parcelas 19 e 20 voltam a ficar em aberto/)
            cy.get('#changed-borrowers').invoke('text').should('match', /João: saldo sobe R\$\s300,00/)

            cy.get('button').contains('Sim, desejo excluir').click()
            cy.contains('Conta deletada com sucesso.')
            cy.contains('[role="button"]', 'Itaú').should('not.exist')

            openDebt(debtId)
            cy.get('#debt-status').should('have.text', 'Atrasada')
            cy.get('#debt-remaining').invoke('text').should('match', brl('36.000,00'))

            openBorrower(borrowerId)
            cy.get('#borrower-balance').invoke('text').should('match', brl('2.000,00'))
          })
        })
      })
    })
  })

  it('leaves "Dívidas" and "Empréstimos" out of the categories of a new transaction and of a plain expense being edited (AE17)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      withCategory('grocery', categoryId => {
        cy.apiRequest('POST', '/transactions', {
          bankAccountId: accountId,
          categoryId,
          name: 'Mercado',
          value: 100,
          date: noonUtc(today),
          type: 'EXPENSE'
        }).its('status').should('eq', 201)
      })
    })

    visitApp('/')
    cy.get('.fixed.right-4.bottom-4 button').click()
    cy.get('[role="menuitem"]').contains('Nova despesa').click()
    cy.get('[role="dialog"] button[role="combobox"]').first().click()
    cy.get('[role="option"]').contains('Alimentação')
    cy.get('[role="option"]').contains('Dívidas').should('not.exist')
    cy.get('[role="option"]').contains('Empréstimos').should('not.exist')
    cy.get('body').type('{esc}{esc}')

    openDashboardEntry('Mercado')
    cy.get('[role="dialog"] button[role="combobox"]').first().click()
    cy.get('[role="option"]').contains('Alimentação')
    cy.get('[role="option"]').contains('Dívidas').should('not.exist')
    cy.get('[role="option"]').contains('Empréstimos').should('not.exist')
  })

  it('shows the category "Dívidas" selected when editing the payment of an installment (AE17)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createDebt(carDebt()).then(debtId => {
        cy.payDebt(debtId, payment([19, 20], accountId, 2450))
      })
    })

    visitApp('/')
    openDashboardEntry('Carro')
    cy.get('[role="dialog"] button[role="combobox"]').first().should('contain', 'Dívidas')
  })
})
