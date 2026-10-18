function generateEmail() {
  return `${Math.random().toString(36).slice(2, 10)}@example.com`
}

// Currency values are formatted with a non-breaking space after "R$".
function brl(value: string) {
  return new RegExp(`R\\$\\s${value.replace(/\./g, '\\.')}`)
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth()
const monthKeyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const monthLabelAt = (offset: number) => {
  const date = new Date(currentYear, currentMonth + offset, 1)
  return `${MONTH_LABELS[date.getMonth()]}/${date.getFullYear()}`
}
const lastMonth15th = new Date(currentYear, currentMonth - 1, 15, 12)
const nextMonth15th = new Date(currentYear, currentMonth + 1, 15, 12)
const noonUtc = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString()

function signUp() {
  cy.register('teste', generateEmail(), 'Red@Mod1')
  cy.location('pathname').should('eq', '/')
  cy.get('nav').should('be.visible')
}

// Closes on the 1st and is due on the 10th: anything bought last month falls
// in the invoice due this month, whatever day the test runs.
function monthlyCard(name: string) {
  return { name, color: '#7950F2', limit: 10000, closingDay: 1, dueDay: 10 }
}

function cardPurchase(description: string, value: number, date: Date, extra: object = {}) {
  return { kind: 'PURCHASE', description, value, date: date.toISOString(), ...extra }
}

function withCategories(keys: string[], type: 'EXPENSE' | 'INCOME', build: (ids: Record<string, string>) => void) {
  cy.apiRequest('GET', '/categories').then(response => {
    const categories = response.body as unknown as { id: string, key: string | null, type: string }[]
    build(Object.fromEntries(keys.map(key => [
      key,
      categories.find(category => category.key === key && category.type === type)!.id
    ])))
  })
}

function createTransaction(accountId: string, categoryId: string, name: string, value: number, type: 'EXPENSE' | 'INCOME' = 'EXPENSE') {
  return cy.apiRequest('POST', '/transactions', {
    bankAccountId: accountId,
    categoryId,
    name,
    value,
    date: noonUtc(today),
    type
  }).then(response => {
    expect(response.status).to.eq(201)
    return response.body.id
  })
}

// Whether an unpaid invoice is in reminder depends on the day the tests run,
// so the reminder modal is dismissed only when the API answered with one.
function visitCategories() {
  // Without If-None-Match the answer is never a bodiless 304.
  cy.intercept('GET', '**/cards/reminders', request => {
    delete request.headers['if-none-match']
  }).as('reminders')
  cy.visit('http://localhost:5173/categorias')
  cy.wait('@reminders').then(({ response }) => {
    if (response?.body.length) cy.get('#invoice-reminder-later').click()
  })
  cy.get('#categories-tree').should('be.visible')
}

const group = (name: string) => cy.contains('#categories-tree > li', name)
const sub = (name: string) => cy.contains('#categories-tree .category-sub', name)

function openNewExpenseSelector() {
  cy.get('.fixed.right-4.bottom-4 button').click()
  cy.get('[role="menuitem"]').contains('Nova despesa').click()
  cy.get('[role="dialog"] button[role="combobox"]').first().click()
}

describe('Categorias', () => {
  it('sums a group with its own items and its subcategories, and lists them all with their subcategory (F1, AE1)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      withCategories(['shopping', 'online_shopping', 'bookstore'], 'EXPENSE', ids => {
        createTransaction(accountId, ids.shopping, 'Mercado Livre', 643)
        createTransaction(accountId, ids.online_shopping, 'Amazon', 244)
        createTransaction(accountId, ids.bookstore, 'Cultura', 144)
      })
    })

    visitCategories()
    cy.get('#categories-month-label').should('have.text', monthLabelAt(0))
    group('Compras').find('.category-total').first().invoke('text').should('match', brl('1.031,00'))
    sub('Compras online').find('.category-total').invoke('text').should('match', brl('244,00'))
    cy.get('#categories-net').invoke('text').should('match', brl('1.031,00'))

    group('Compras').find('.category-open').first().click()
    cy.get('#category-items .category-item').should('have.length', 3)
    cy.contains('.category-item', 'Amazon').should('contain', 'Compras online').and('contain', 'Itaú')
    cy.contains('.category-item', 'Cultura').should('contain', 'Livraria')
    cy.contains('.category-item', 'Mercado Livre').should('not.contain', 'Compras online').and('not.contain', 'Livraria')
  })

  it('shows the income tab with its own tree (R22)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      withCategories(['salary'], 'INCOME', ids => {
        createTransaction(accountId, ids.salary, 'Salário', 5000, 'INCOME')
      })
    })

    visitCategories()
    cy.get('#categories-tab-income').click()
    group('Receita').find('.category-total').first().invoke('text').should('match', brl('5.000,00'))
    sub('Salário').find('.category-total').invoke('text').should('match', brl('5.000,00'))
    cy.get('#categories-tree').should('not.contain', 'Alimentação')
  })

  it('counts an installment purchase by the month of each invoice (AE2)', () => {
    signUp()
    cy.createCard(monthlyCard('Nubank')).then(cardId => {
      withCategories(['electronics'], 'EXPENSE', ids => {
        cy.createCardPurchase(cardId, cardPurchase('Notebook', 1200, lastMonth15th, {
          categoryId: ids.electronics,
          installmentsCount: 12
        }))
      })
    })

    visitCategories()
    sub('Eletrônicos').find('.category-total').invoke('text').should('match', brl('100,00'))
    sub('Eletrônicos').find('.category-open').click()
    cy.contains('.category-item', 'Notebook').find('.item-installment').should('have.text', '1/12')
    cy.get('[role="dialog"] header button').first().click()

    cy.get('#categories-month-next').click()
    cy.get('#categories-month-label').should('have.text', monthLabelAt(1))
    sub('Eletrônicos').find('.category-total').invoke('text').should('match', brl('100,00'))
    sub('Eletrônicos').find('.category-open').click()
    cy.contains('.category-item', 'Notebook').find('.item-installment').should('have.text', '2/12')
  })

  it('marks the forecast of a recurring charge in the month of its invoice (AE3)', () => {
    signUp()
    cy.createCard(monthlyCard('Nubank')).then(cardId => {
      withCategories(['music'], 'EXPENSE', ids => {
        cy.apiRequest('POST', `/cards/${cardId}/recurring-charges`, {
          description: 'Spotify',
          value: 12.9,
          categoryId: ids.music,
          firstChargeDate: nextMonth15th.toISOString()
        }).its('status').should('eq', 201)
      })
    })

    visitCategories()
    // A charge on the 15th closes on the 1st of the month after, due on the 10th.
    cy.get('#categories-month-next').click().click()
    cy.get('#categories-month-label').should('have.text', monthLabelAt(2))
    sub('Música').find('.category-total').invoke('text').should('match', brl('12,90'))
    sub('Música').find('.category-open').click()
    cy.contains('.category-item', 'Spotify').find('.item-forecast').should('have.text', 'Previsão')
  })

  it('counts the purchases of an invoice once when it is paid, even after the payment category changes (AE4, AE11)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.createCard(monthlyCard('Nubank')).then(cardId => {
        withCategories(['food', 'other'], 'EXPENSE', ids => {
          cy.createCardPurchase(cardId, cardPurchase('Jantar', 2000, lastMonth15th, { categoryId: ids.food }))
          cy.payInvoice(cardId, monthKeyOf(today), { bankAccountId: accountId, value: 2000, date: today.toISOString() })
            .then(paymentId => {
              cy.apiRequest('PUT', `/transactions/${paymentId}`, {
                bankAccountId: accountId,
                categoryId: ids.other,
                name: 'Fatura Nubank',
                value: 2000,
                date: today.toISOString(),
                type: 'EXPENSE'
              }).its('status').should('eq', 200)
            })
        })
      })
    })

    visitCategories()
    cy.get('#categories-net').invoke('text').should('match', brl('2.000,00'))
    group('Alimentação').find('.category-total').first().invoke('text').should('match', brl('2.000,00'))
    group('Outros').find('.category-total').first().invoke('text').should('match', brl('0,00'))
  })

  it('shows a refund alone in its category as a negative value (AE5)', () => {
    signUp()
    cy.createCard(monthlyCard('Nubank')).then(cardId => {
      withCategories(['cashback'], 'EXPENSE', ids => {
        cy.createCardPurchase(cardId, cardPurchase('Estorno', 50, lastMonth15th, {
          kind: 'REFUND',
          categoryId: ids.cashback
        }))
      })
    })

    visitCategories()
    sub('Cashback').find('.category-total').invoke('text').should('match', /-R\$\s50,00/)
  })

  it('creates a subcategory from the group menu, and offers it indented in the selector (F2)', () => {
    signUp()
    cy.createBankAccount('Itaú')

    visitCategories()
    group('Compras').find('.category-menu').click()
    cy.contains('[role="menuitem"]', 'Criar subcategoria').click()
    cy.get('#categoryName').type('Ração')
    cy.get('#categorySubmit').click()
    cy.contains('Categoria criada!')
    sub('Ração').should('be.visible')

    cy.visit('http://localhost:5173/')
    openNewExpenseSelector()
    cy.get('[role="option"]').then($options => {
      const texts = [...$options].map(option => option.textContent)
      expect(texts[texts.indexOf('Ração') - 1]).to.eq('Roupas')
    })
    cy.contains('[role="option"]', 'Ração').should('have.class', 'pl-6')
    cy.contains('[role="option"]', /^Compras$/).should('not.have.class', 'pl-6')
  })

  it('refuses a subcategory named like another of the same group, ignoring case (AE13)', () => {
    signUp()

    visitCategories()
    group('Alimentação').find('.category-menu').click()
    cy.contains('[role="menuitem"]', 'Criar subcategoria').click()
    cy.get('#categoryName').type('delivery')
    cy.get('#categorySubmit').click()
    cy.contains('Já existe uma categoria com esse nome')
    cy.get('#categoryName').should('be.visible')
  })

  it('moves the items of a deleted subcategory to its group (AE6)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      withCategories(['shopping'], 'EXPENSE', ids => {
        cy.apiRequest('POST', '/categories', { name: 'Ração', parentId: ids.shopping }).then(response => {
          expect(response.status).to.eq(201)
          createTransaction(accountId, response.body.id, 'Ração do Rex', 80)
        })
      })
    })

    visitCategories()
    group('Compras').find('.category-total').first().invoke('text').should('match', brl('80,00'))
    sub('Ração').find('.category-menu').click()
    cy.contains('[role="menuitem"]', 'Excluir').click()
    cy.contains('button', 'Sim, desejo excluir').click()
    cy.contains('Categoria excluída!')

    cy.get('#categories-tree').should('not.contain', 'Ração')
    group('Compras').find('.category-total').first().invoke('text').should('match', brl('80,00'))
    group('Compras').find('.category-open').first().click()
    cy.contains('.category-item', 'Ração do Rex').should('be.visible')
  })

  it('asks for a destination when deleting a group, offering only categories of its type outside the group, and moves everything there (F3, AE7)', () => {
    signUp()
    cy.createBankAccount('Itaú').then(accountId => {
      cy.apiRequest('POST', '/categories', { name: 'Casamento', type: 'EXPENSE', icon: 'heart', color: '#E64980' }).then(response => {
        const groupId = response.body.id
        createTransaction(accountId, groupId, 'Entrada do salão', 200)
        cy.apiRequest('POST', '/categories', { name: 'Buffet', parentId: groupId }).then(subResponse => {
          createTransaction(accountId, subResponse.body.id, 'Buffet do jantar', 300)
        })
        cy.apiRequest('POST', '/categories', { name: 'Fotógrafo', parentId: groupId })
      })
    })

    visitCategories()
    group('Casamento').find('.category-total').first().invoke('text').should('match', brl('500,00'))
    group('Casamento').find('.category-menu').first().click()
    cy.contains('[role="menuitem"]', 'Excluir').click()

    // Confirming without a destination keeps the group.
    cy.contains('button', 'Sim, desejo excluir').click()
    cy.contains('Escolha o destino dos itens')

    cy.get('#categoryDestination').click()
    cy.contains('[role="option"]', 'Entretenimento').should('exist')
    ;['Casamento', 'Buffet', 'Fotógrafo', 'Salário', 'Metas', 'Fatura de cartão', 'Dívidas', 'Empréstimos'].forEach(name => {
      cy.contains('[role="option"]', new RegExp(`^${name}$`)).should('not.exist')
    })
    cy.contains('[role="option"]', 'Entretenimento').scrollIntoView().click()
    cy.contains('button', 'Sim, desejo excluir').click()
    cy.contains('Categoria excluída!')

    cy.get('#categories-tree').should('not.contain', 'Casamento').and('not.contain', 'Fotógrafo')
    group('Lazer').find('.category-total').first().invoke('text').should('match', brl('500,00'))
    sub('Entretenimento').find('.category-total').invoke('text').should('match', brl('500,00'))
  })

  it('offers the grouped tree and hides every system category in a new expense (AE8)', () => {
    signUp()
    cy.createBankAccount('Itaú')

    cy.visit('http://localhost:5173/')
    openNewExpenseSelector()
    cy.get('[role="option"]').then($options => {
      const texts = [...$options].map(option => option.textContent)
      const food = texts.indexOf('Alimentação')
      expect(food).to.be.gte(0)
      expect(texts.slice(food + 1, food + 4)).to.deep.eq(['Delivery', 'Supermercado', 'Restaurantes'])
    })
    ;['Metas', 'Fatura de cartão', 'Dívidas', 'Empréstimos'].forEach(name => {
      cy.contains('[role="option"]', name).should('not.exist')
    })
  })

  it('gives a default group only "Criar subcategoria", and a default subcategory or Dívidas no menu (AE10)', () => {
    signUp()

    visitCategories()
    group('Alimentação').find('.category-menu').click()
    cy.get('[role="menuitem"]').should('have.length', 1).and('contain', 'Criar subcategoria')
    cy.get('body').type('{esc}')

    sub('Delivery').find('.category-menu').should('not.exist')
    group('Dívidas').find('.category-menu').should('not.exist')
  })

  it('goes from December to January of the next year in the month selector (R22)', () => {
    signUp()

    visitCategories()
    for (let month = currentMonth; month < 11; month++) {
      cy.get('#categories-month-next').click()
    }
    cy.get('#categories-month-label').should('have.text', `Dez/${currentYear}`)
    cy.get('#categories-month-next').click()
    cy.get('#categories-month-label').should('have.text', `Jan/${currentYear + 1}`)
    cy.get('#categories-tree').should('be.visible')
  })
})
