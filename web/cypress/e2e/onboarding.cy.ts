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

const PASSWORD = 'Red@Mod1'
const today = new Date()
const daysFromToday = (days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, 12)

// Signs up through the screen, without cy.register, which ends the onboarding.
function signUp(email = generateEmail()) {
  cy.visit('http://localhost:5173/register')
  cy.get('#name').type('teste')
  cy.get('#email').type(email)
  cy.get('#password').type(PASSWORD)
  cy.get('button').contains('Criar conta').click()
  cy.location('pathname').should('eq', '/configuracao')
  shouldBeOn('Contas e saldos')
}

function signIn(email: string) {
  cy.get('#email').type(email)
  cy.get('#password').type(PASSWORD)
  cy.get('button').contains('Entrar').click()
}

function shouldBeOn(title: string) {
  cy.get('h1').should('have.text', title)
}

function goToStep(label: string, title: string) {
  cy.contains('nav[aria-label="Etapas da configuração"] button', label).click()
  shouldBeOn(title)
}

// The footer's main button: "Pular etapa", "Continuar" or "Concluir".
function next(label: string, title: string) {
  cy.contains('footer button', label).click()
  shouldBeOn(title)
}

const stepItem = (name: string) => cy.contains('li', name)

function addAccount(name: string, balance: string) {
  cy.get('button').contains('Adicionar conta').click()
  cy.get('[role="dialog"] input').first().clear().type(balance)
  cy.get('#name').type(name)
  cy.get('[role="dialog"] button').contains('Cor').click()
  cy.get('[role="menuitem"]').first().click()
  cy.get('[role="dialog"] button').contains('Criar').click()
  cy.contains('Conta cadastrada com sucesso.')
}

function setBudget(category: string, amount: string) {
  cy.contains('li button', category).click()
  cy.get('#categoryBudgetAmount').clear().type(amount)
  cy.get('#categoryBudgetSubmit').click()
  stepItem(category).invoke('text').should('match', brl(`${amount},00`))
}

function withCategory(key: string, build: (categoryId: string) => void) {
  cy.apiRequest('GET', '/categories').then(response => {
    const categories = response.body as unknown as { id: string, key: string | null, type: string }[]
    build(categories.find(category => category.key === key && category.type === 'EXPENSE')!.id)
  })
}

function withOpenInvoiceMonth(cardId: string, build: (month: string) => void) {
  cy.apiRequest('GET', '/cards').then(response => {
    const cards = response.body as unknown as { id: string, openInvoiceMonth: string }[]
    build(cards.find(card => card.id === cardId)!.openInvoiceMonth)
  })
}

// Closes tomorrow and was due yesterday: the last closed invoice is already
// past its due date, so only the open one waits for payment, whatever the day.
function onlyOpenInvoiceCard(name: string) {
  return {
    name,
    color: '#7950F2',
    limit: 10000,
    closingDay: daysFromToday(1).getDate(),
    dueDay: daysFromToday(-1).getDate()
  }
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

describe('Configuração', () => {
  it('lands on the Contas step after signing up and lists an account added there with its balance (F1)', () => {
    signUp()

    cy.get('[aria-current="step"]').should('contain', 'Contas')
    cy.contains('footer button', 'Voltar').should('not.exist')
    cy.contains('footer button', 'Pular etapa').should('be.visible')

    addAccount('Itaú', '2500')
    stepItem('Itaú').invoke('text').should('match', brl('2.500,00'))
    cy.contains('footer button', 'Continuar').should('be.visible')
  })

  it('comes back to the step it was on, with its limits, after a reload (AE5)', () => {
    signUp()
    goToStep('Categorias e limites', 'Limites por categoria')

    setBudget('Supermercado', '200')
    setBudget('Presentes', '150')

    cy.reload()
    shouldBeOn('Limites por categoria')
    stepItem('Supermercado').invoke('text').should('match', brl('200,00'))
    stepItem('Presentes').invoke('text').should('match', brl('150,00'))
  })

  it('sends an app page to the configuration while the onboarding is pending', () => {
    signUp()

    cy.visit('http://localhost:5173/cartoes')
    cy.location('pathname').should('eq', '/configuracao')
    shouldBeOn('Contas e saldos')
  })

  it('signs out from the user menu without ending the onboarding', () => {
    const email = generateEmail()
    signUp(email)
    next('Pular etapa', 'Cartões de crédito')

    cy.get('header [aria-haspopup="menu"]').click()
    cy.contains('[role="menuitem"]', 'Sair').click()
    cy.location('pathname').should('eq', '/login')

    signIn(email)
    cy.location('pathname').should('eq', '/configuracao')
    shouldBeOn('Cartões de crédito')
  })

  it('opens the Dashboard after "Sair da configuração" is confirmed, and from then on (AE6)', () => {
    signUp()

    cy.contains('header button', 'Sair da configuração').click()
    cy.contains('[role="dialog"] button', 'Continuar configurando').click()
    cy.get('[role="dialog"]').should('not.exist')
    shouldBeOn('Contas e saldos')

    cy.contains('header button', 'Sair da configuração').click()
    cy.contains('[role="dialog"] button', 'Sair da configuração').click()
    cy.location('pathname').should('eq', '/')
    cy.get('nav').should('be.visible')

    cy.visit('http://localhost:5173/configuracao')
    cy.location('pathname').should('eq', '/')
  })

  it('tells that goals need an account, goes back to Contas and then offers the goal form (AE4)', () => {
    signUp()
    next('Pular etapa', 'Cartões de crédito')
    next('Pular etapa', 'Parcelas, assinaturas e faturas')
    next('Pular etapa', 'Limites por categoria')
    next('Pular etapa', 'Metas')

    cy.contains('Metas precisam de uma conta de origem')
    cy.get('button').contains('Voltar a Contas').click()
    shouldBeOn('Contas e saldos')

    addAccount('Itaú', '1000')
    next('Continuar', 'Cartões de crédito')
    next('Pular etapa', 'Parcelas, assinaturas e faturas')
    next('Pular etapa', 'Limites por categoria')
    next('Pular etapa', 'Metas')

    cy.contains('Metas precisam de uma conta de origem').should('not.exist')
    cy.get('button').contains('Adicionar meta').click()
    cy.get('[role="dialog"]').should('contain', 'Nova meta')
    cy.get('#goal-no-accounts').should('not.exist')
  })

  it('leaves the entry option out of a new debt on the Dívidas step', () => {
    signUp()
    goToStep('Dívidas', 'Dívidas e empréstimos')

    cy.get('button').contains('Adicionar dívida').click()
    cy.get('#debtName').should('be.visible')
    cy.get('#debtHasEntry').should('not.exist')
  })

  it('puts a wishlist item created on the Wishlist step in Geral', () => {
    signUp()
    goToStep('Wishlist', 'Wishlist')

    cy.get('button').contains('Adicionar item').click()
    cy.get('#wishlistItemListId').should('contain', 'Geral')
    cy.get('#wishlistItemName').type('Fone')
    cy.get('#wishlistItemSubmit').click()
    cy.contains('Item criado com sucesso!')
    stepItem('Fone').should('be.visible')

    cy.apiRequest('DELETE', '/users/me/onboarding').its('status').should('eq', 200)
    visitApp('/wishlist')
    cy.contains('.wishlist-item', 'Fone').should('contain', 'Geral')
  })

  it('shows the new limit of a card added and edited on the Cartões step', () => {
    signUp()
    goToStep('Cartões', 'Cartões de crédito')

    cy.get('button').contains('Adicionar cartão').click()
    cy.get('#cardLimit').clear().type('5000')
    cy.get('#name').type('Nubank')
    cy.get('#closingDay').type('1')
    cy.get('#dueDay').type('10')
    cy.get('[role="dialog"] button').contains('Cor').click()
    cy.get('[role="menuitem"]').first().click()
    cy.get('button').contains('Cadastrar cartão').click()
    cy.contains('Cartão cadastrado com sucesso!')
    stepItem('Nubank').invoke('text').should('match', brl('5.000,00'))

    cy.contains('li button', 'Nubank').click()
    cy.get('#cardLimit').clear().type('8000')
    cy.get('[role="dialog"] button').contains('Salvar').click()
    cy.contains('Cartão atualizado!')
    stepItem('Nubank').invoke('text').should('match', brl('8.000,00'))
  })

  it('shows the notice and "Voltar a Cartões" on the Parcelas step without a card', () => {
    signUp()
    goToStep('Parcelas e assinaturas', 'Parcelas, assinaturas e faturas')

    cy.contains('Nenhum cartão cadastrado.')
    cy.get('button').contains('Voltar a Cartões').click()
    shouldBeOn('Cartões de crédito')
  })

  it('takes what the bank says is left on the open invoice, shows it on Conferir and concludes on the Dashboard (AE1)', () => {
    signUp()
    cy.createCard(onlyOpenInvoiceCard('Itaú')).then(cardId => {
      withCategory('leisure', categoryId => {
        withOpenInvoiceMonth(cardId, openInvoiceMonth => {
          cy.createCardPurchase(cardId, {
            kind: 'PURCHASE',
            description: 'iPhone',
            value: 541.58,
            date: new Date(today.getFullYear(), today.getMonth() - 3, 15, 12).toISOString(),
            installmentsCount: 12,
            currentInstallment: 4,
            anchorInvoiceMonth: openInvoiceMonth,
            categoryId
          })
        })
        // Charged yesterday, so it is on the open invoice and not a forecast.
        cy.apiRequest('POST', `/cards/${cardId}/recurring-charges`, {
          description: 'Netflix',
          value: 55.9,
          categoryId,
          firstChargeDate: daysFromToday(-1).toISOString()
        }).its('status').should('eq', 201)
      })

      goToStep('Parcelas e assinaturas', 'Parcelas, assinaturas e faturas')
      cy.get('section[aria-label="Itaú"]').should('contain', 'iPhone').and('contain', 'Netflix')
      cy.contains('label', 'Fatura fechada').should('not.exist')
      cy.contains('label', 'Fatura aberta').invoke('attr', 'for').then(fieldId => {
        cy.get(`#${fieldId}`).should('have.value', '597,48').clear().type('1240{enter}')
        cy.contains('Salvo')
        cy.get(`#${fieldId}`).should('have.value', '1.240,00')
      })

      goToStep('Conferir com o banco', 'Conferir com o banco')
      stepItem('Fatura aberta').invoke('text').should('match', brl('1.240,00'))

      cy.contains('footer button', 'Concluir').click()
      cy.location('pathname').should('eq', '/')
      cy.get('nav').should('be.visible')

      visitApp(`/cartoes/${cardId}`)
      cy.get('#card-name').should('be.visible')
      cy.contains('.invoice-entry', 'Compras antes do fintrack').invoke('text').should('match', brl('642,52'))
      cy.get('#invoice-balance').invoke('text').should('match', brl('1.240,00'))
    })
  })

  it('returns to Conferir with the new total after correcting an account there (AE7)', () => {
    signUp()
    cy.createBankAccount('Itaú', 8120)
    cy.createBankAccount('Inter', 500)
    // The accounts the Contas step already read stay cached until the page loads again.
    cy.reload()
    goToStep('Conferir com o banco', 'Conferir com o banco')
    cy.get('#review-total').invoke('text').should('match', brl('8.620,00'))

    stepItem('Itaú').contains('button', 'Corrigir').click()
    shouldBeOn('Contas e saldos')
    cy.get('[role="dialog"]').should('contain', 'Editar conta')
    cy.get('[role="dialog"] input').first().clear().type('8210')
    cy.get('[role="dialog"] button').contains('Salvar').click()

    shouldBeOn('Conferir com o banco')
    cy.get('#review-total').invoke('text').should('match', brl('8.710,00'))
  })
})
