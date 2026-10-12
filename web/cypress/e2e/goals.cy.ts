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

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth()
const nextYear = currentYear + 1
const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
const noon = (year: number, month: number, day: number) => new Date(year, month, day, 12).toISOString()

function signUp() {
  cy.register('teste', generateEmail(), 'Red@Mod1')
  cy.location('pathname').should('eq', '/')
  cy.get('nav').should('be.visible')
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
    startDate: noon(currentYear, currentMonth, 1),
    endDate: noon(nextYear, currentMonth, 28),
    bankAccountId
  }
}

function resolveCurrentMonth(goalId: string, body: object) {
  cy.apiRequest('POST', `/goals/${goalId}/reminders/${currentMonthKey}`, body)
    .its('status')
    .should('eq', 201)
}

// The date picker always opens on the current month.
function pickDate(id: string, target: Date) {
  const monthsAhead = (target.getFullYear() - currentYear) * 12 + target.getMonth() - currentMonth

  cy.get(`#${id}`).click()
  for (let i = 0; i < monthsAhead; i++) {
    cy.get('button[name="next-month"]').click()
  }
  cy.get('button[name="day"]').contains(new RegExp(`^${target.getDate()}$`)).click()
  cy.get('#name').click()
}

function openNewGoalForm() {
  cy.visit('http://localhost:5173/metas')
  cy.get('button').contains('Nova meta').click()
}

function selectAccount(name: string) {
  cy.get('#bankAccountId').click()
  cy.get('[role="option"]').contains(name).click()
}

describe('Metas', () => {
  it('creates a scheduled goal with the suggested contribution and the projection (F1, AE1)', () => {
    signUp()
    cy.createBankAccount('Nubank')

    openNewGoalForm()
    cy.get('#name').type('Viagem')
    cy.get('#targetAmount').clear().type('10000')
    cy.get('#initialSaved').clear().type('1000')
    pickDate('startDate', new Date(nextYear, 0, 1))
    pickDate('endDate', new Date(nextYear, 11, 31))
    cy.get('#contributionDay').type('5')
    selectAccount('Nubank')

    cy.get('#goal-suggestion').invoke('text').should('match', brl('750,00'))

    cy.get('#monthlyContribution').clear().type('500')
    cy.get('#goal-projection').invoke('text')
      .should('match', brl('7.000,00'))
      .and('match', brl('3.000,00'))

    cy.get('button').contains('Criar meta').click()
    cy.contains('Meta criada com sucesso!')

    cy.contains('[role="tab"]', 'Agendadas').click()
    cy.contains('a', 'Viagem').invoke('text').should('match', brl('1.000,00'))
  })

  it('rounds the suggestion up to the cent', () => {
    signUp()
    cy.createBankAccount('Nubank')

    openNewGoalForm()
    cy.get('#name').type('Notebook')
    cy.get('#targetAmount').clear().type('10000')
    pickDate('startDate', new Date(nextYear, 0, 1))
    pickDate('endDate', new Date(nextYear, 2, 31))
    cy.get('#contributionDay').type('5')

    cy.get('#goal-suggestion').invoke('text').should('match', brl('3.333,34'))
    cy.get('button').contains('Usar sugestão').click()
    cy.get('#monthlyContribution').should('have.value', '3.333,34')
  })

  it('moves a day-31 contribution to the last day of shorter months (shared case with the API)', () => {
    signUp()
    cy.createBankAccount('Nubank')

    openNewGoalForm()
    cy.get('#name').type('Curso')
    cy.get('#targetAmount').clear().type('3000')
    pickDate('startDate', new Date(nextYear, 1, 15))
    pickDate('endDate', new Date(nextYear, 3, 30))
    cy.get('#contributionDay').type('31')

    cy.get('#goal-suggestion').invoke('text').should('match', brl('1.000,00'))
  })

  it('shows the current month reminder and records the contribution when confirmed (F2)', () => {
    signUp()
    cy.createBankAccount('Nubank', 1000)

    openNewGoalForm()
    cy.get('#name').type('Reserva')
    cy.get('#targetAmount').clear().type('3000')
    pickDate('startDate', new Date(currentYear, currentMonth, 1))
    cy.get('#contributionDay').type('1')
    selectAccount('Nubank')
    cy.get('#monthlyContribution').clear().type('500')
    cy.get('button').contains('Criar meta').click()
    cy.contains('[role="tab"]', 'Em andamento').should('have.attr', 'aria-selected', 'true')
    cy.contains('a', 'Reserva')

    cy.reload()
    cy.get('#reminder-goal').should('have.text', 'Reserva')
    cy.get('#reminder-confirm').click()
    cy.contains('Aporte registrado!')
    cy.get('#reminder-goal').should('not.exist')

    cy.get('#summary-monthly').invoke('text').should('match', brl('500,00'))
    cy.get('#summary-total').invoke('text').should('match', brl('500,00'))

    cy.get('nav').contains('Dashboard').click()
    cy.contains('[role="button"]', 'Aporte: Reserva')
    cy.contains('[role="button"]', 'Nubank').invoke('text').should('match', brl('500,00'))
  })

  it('records "Não aportei" in the goal history (F2)', () => {
    signUp()
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal(pendingGoal('Carro', accountId)).then(goalId => {
        cy.reload()
        cy.get('#reminder-goal').should('have.text', 'Carro')
        cy.get('#reminder-skip').click()
        cy.get('#reminder-goal').should('not.exist')

        cy.visit(`http://localhost:5173/metas/${goalId}`)
        cy.get('#goal-history').contains('Não aportei')
      })
    })
  })

  it('brings a closed reminder back only after the app is opened again (R30)', () => {
    signUp()
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal(pendingGoal('Casa', accountId))
    })

    cy.reload()
    cy.get('#reminder-goal').should('have.text', 'Casa')
    cy.get('[role="dialog"] header button').first().click()
    cy.get('#reminder-goal').should('not.exist')

    cy.get('nav').contains('Metas').click()
    cy.get('nav').contains('Dashboard').click()
    cy.get('#reminder-goal').should('not.exist')

    cy.reload()
    cy.get('#reminder-goal').should('have.text', 'Casa')
  })

  it('moves on without an error when the month was already resolved elsewhere (409)', () => {
    signUp()
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal(pendingGoal('Primeira', accountId)).then(firstGoalId => {
        cy.createGoal(pendingGoal('Segunda', accountId))

        cy.reload()
        cy.get('#reminder-goal').should('have.text', 'Primeira')
        resolveCurrentMonth(firstGoalId, { action: 'SKIP' })

        cy.get('#reminder-confirm').click()
        cy.get('#reminder-goal').should('have.text', 'Segunda')
        cy.contains('Não foi possível registrar a resposta').should('not.exist')
      })
    })
  })

  it('disables both answers while a confirmation is in flight', () => {
    signUp()
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal(pendingGoal('Moto', accountId))
    })
    cy.intercept('POST', '**/goals/*/reminders/*', req => {
      req.continue(res => {
        res.setDelay(1500)
      })
    })

    cy.reload()
    cy.get('#reminder-confirm').click()
    cy.get('#reminder-confirm').should('be.disabled')
    cy.get('#reminder-skip').should('be.disabled')
    cy.get('#reminder-goal').should('not.exist')
  })

  it('keeps the reminder open on a network error', () => {
    signUp()
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal(pendingGoal('Bike', accountId))
    })
    cy.intercept('POST', '**/goals/*/reminders/*', { forceNetworkError: true })

    cy.reload()
    cy.get('#reminder-confirm').click()
    cy.contains('Não foi possível registrar a resposta. Tente novamente.')
    cy.get('#reminder-goal').should('have.text', 'Bike')
  })

  it('archives returning the money and keeps the goal read-only (F3, AE7)', () => {
    signUp()
    cy.createBankAccount('Nubank', 1000).then(accountId => {
      cy.createGoal(pendingGoal('Viagem', accountId)).then(goalId => {
        resolveCurrentMonth(goalId, { action: 'CONFIRM', value: 500 })

        cy.visit(`http://localhost:5173/metas/${goalId}`)
        cy.get('button').contains('Arquivar').click()
        cy.get('#archive-return').click()
        cy.contains('Meta arquivada e dinheiro devolvido às contas.')
        cy.get('#goal-status').should('have.text', 'Arquivada')
        cy.get('main').find('button').should('not.exist')
        cy.get('#goal-history').contains('Resgate')
      })
    })

    cy.get('nav').contains('Dashboard').click()
    cy.contains('[role="button"]', 'Resgate: Viagem')
    cy.contains('[role="button"]', 'Nubank').invoke('text').should('match', brl('1.000,00'))

    cy.get('nav').contains('Metas').click()
    cy.contains('[role="tab"]', 'Arquivadas').click()
    cy.contains('a', 'Viagem')
  })

  it('refuses to delete the source account of a goal (AE8)', () => {
    signUp()
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal(pendingGoal('Faculdade', accountId)).then(goalId => {
        resolveCurrentMonth(goalId, { action: 'SKIP' })
      })
    })

    cy.visit('http://localhost:5173/')
    cy.contains('[role="button"]', 'Nubank').click()
    cy.get('[role="dialog"] header button').last().click()
    cy.get('button').contains('Sim, desejo excluir').click()
    cy.contains('Esta conta está ligada às metas: Faculdade.')

    cy.get('[role="dialog"] header button').first().click()
    cy.contains('[role="button"]', 'Nubank').should('exist')
  })

  it('refuses to delete an account that holds a goal contribution moved to it (AE9)', () => {
    signUp()
    cy.createBankAccount('Inter', 0)
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal(pendingGoal('Apartamento', accountId)).then(goalId => {
        resolveCurrentMonth(goalId, { action: 'CONFIRM', value: 500 })
      })
    })

    cy.visit('http://localhost:5173/')
    cy.contains('[role="button"]', 'Aporte: Apartamento').click()
    cy.get('[role="dialog"] button[role="combobox"]').eq(1).click()
    cy.get('[role="option"]').contains('Inter').click()
    cy.get('button').contains('Salvar').click()
    cy.contains('Despesa editada com sucesso!')

    cy.contains('[role="button"]', 'Inter').click()
    cy.get('[role="dialog"] header button').last().click()
    cy.get('button').contains('Sim, desejo excluir').click()
    cy.contains('Esta conta está ligada às metas: Apartamento.')
  })

  it('updates the goal card when a contribution is edited on the Dashboard (AE5, R12)', () => {
    signUp()
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal(pendingGoal('Celular', accountId)).then(goalId => {
        resolveCurrentMonth(goalId, { action: 'CONFIRM', value: 500 })
      })
    })

    cy.visit('http://localhost:5173/metas')
    cy.contains('a', 'Celular').invoke('text').should('match', brl('500,00'))

    cy.get('nav').contains('Dashboard').click()
    cy.contains('[role="button"]', 'Aporte: Celular').click()
    cy.get('[role="dialog"] input').first().clear().type('300')
    cy.get('button').contains('Salvar').click()
    cy.contains('Despesa editada com sucesso!')

    cy.get('nav').contains('Metas').click()
    cy.contains('a', 'Celular').invoke('text').should('match', brl('300,00'))
  })

  it('registers a manual contribution from the goal page', () => {
    signUp()
    cy.createBankAccount('Nubank', 1000).then(accountId => {
      cy.createGoal(pendingGoal('Sofá', accountId)).then(goalId => {
        resolveCurrentMonth(goalId, { action: 'SKIP' })
        cy.visit(`http://localhost:5173/metas/${goalId}`)
      })
    })

    cy.get('button').contains('Novo aporte').click()
    cy.get('#contributionValue').clear().type('250')
    cy.get('button').contains('Registrar aporte').click()
    cy.contains('Aporte registrado!')
    cy.get('#goal-total').invoke('text').should('match', brl('250,00'))

    cy.get('nav').contains('Dashboard').click()
    cy.contains('[role="button"]', 'Aporte: Sofá')
    cy.contains('[role="button"]', 'Nubank').invoke('text').should('match', brl('750,00'))
  })

  it('only offers delete, without manual contributions, for a scheduled goal with no contributions', () => {
    signUp()
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal({
        ...pendingGoal('Agendada', accountId),
        startDate: noon(nextYear, 0, 1),
        endDate: noon(nextYear, 11, 31)
      }).then(goalId => {
        cy.visit(`http://localhost:5173/metas/${goalId}`)
      })
    })

    cy.get('#goal-status').should('have.text', 'Agendada')
    cy.get('main').contains('button', 'Novo aporte').should('not.exist')
    cy.get('button').contains('Excluir').click()
    cy.get('button').contains('Sim, desejo excluir').click()
    cy.location('pathname').should('eq', '/metas')
    cy.contains('Meta excluída com sucesso!')
  })

  it('shows a goal that ended below the target as completed (AE6)', () => {
    signUp()
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal({
        ...pendingGoal('Antiga', accountId),
        targetAmount: 10000,
        initialSaved: 7000,
        startDate: noon(currentYear - 1, 0, 1),
        endDate: noon(currentYear - 1, 11, 31)
      }).then(goalId => {
        cy.visit('http://localhost:5173/metas')
        cy.contains('[role="tab"]', 'Concluídas').click()
        cy.contains('a', 'Antiga').contains('Terminou abaixo do alvo')

        cy.visit(`http://localhost:5173/metas/${goalId}`)
        cy.get('#goal-result').invoke('text').should('match', brl('3.000,00'))
      })
    })
  })

  it('redirects an unknown goal to the goals page', () => {
    signUp()

    cy.visit('http://localhost:5173/metas/00000000-0000-0000-0000-000000000000')
    cy.location('pathname').should('eq', '/metas')
    cy.contains('Meta não encontrada.')
  })

  it('navigates between Dashboard and Metas from the menu', () => {
    signUp()

    cy.get('nav a[aria-current="page"]').should('have.text', 'Dashboard')
    cy.get('nav').contains('Metas').click()
    cy.location('pathname').should('eq', '/metas')
    cy.get('nav a[aria-current="page"]').should('have.text', 'Metas')
    cy.get('nav').contains('Dashboard').click()
    cy.location('pathname').should('eq', '/')
  })

  it('shows an empty page to a new user, without goals from the previous user', () => {
    signUp()
    cy.createBankAccount('Nubank').then(accountId => {
      cy.createGoal(pendingGoal('Meta do primeiro', accountId)).then(goalId => {
        resolveCurrentMonth(goalId, { action: 'SKIP' })
      })
    })
    cy.visit('http://localhost:5173/metas')
    cy.contains('a', 'Meta do primeiro')

    cy.get('header div.rounded-full').click()
    cy.contains('[role="menuitem"]', 'Sair').click()
    cy.get('a').contains('Crie sua conta').click()
    cy.get('#name').type('segundo')
    cy.get('#email').type(generateEmail())
    cy.get('#password').type('Red@Mod1')
    cy.get('button').contains('Criar conta').click()
    cy.location('pathname').should('eq', '/')

    cy.get('nav').contains('Metas').click()
    cy.contains('Nenhuma meta em andamento.')
    cy.contains('Meta do primeiro').should('not.exist')
    cy.get('#summary-total').invoke('text').should('match', brl('0,00'))
    cy.get('#reminder-goal').should('not.exist')

    cy.get('button').contains('Nova meta').click()
    cy.get('#goal-no-accounts').should('be.visible')
  })
})
