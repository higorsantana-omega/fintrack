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

function signUp() {
  cy.register('teste', generateEmail(), 'Red@Mod1')
  cy.location('pathname').should('eq', '/')
  cy.get('nav').should('be.visible')
}

const today = new Date()
const monthAt = (offset: number) => new Date(today.getFullYear(), today.getMonth() + offset, 1)
const monthKeyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const noonUtc = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString()
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const monthLabelOf = (date: Date) => `${MONTH_LABELS[date.getMonth()]}/${date.getFullYear()}`
const todayLabel = Intl.DateTimeFormat('pt-br').format(today)

function selectOption(id: string, label: string) {
  cy.get(`#${id}`).click()
  cy.get('[role="option"]').contains(label).click()
  cy.get('[role="listbox"]').should('not.exist')
}

function withCategory(key: string, build: (categoryId: string) => void) {
  cy.apiRequest('GET', '/categories').then(response => {
    const categories = response.body as unknown as { id: string, key: string | null, type: string }[]
    build(categories.find(category => category.key === key && category.type === 'EXPENSE')!.id)
  })
}

// The reminder windows of the other modules appear only when the API answers with one.
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

function visitWishlist() {
  visitApp('/wishlist')
  cy.get('#wishlist-lists').should('be.visible')
}

function monthlyCard(name: string, limit = 10000) {
  return { name, color: '#7950F2', limit, closingDay: 1, dueDay: 10 }
}

const itemRow = (name: string) => cy.contains('.wishlist-item', name)
const linkCard = (storeName: string) => cy.get(`.wishlist-link[data-store-name="${storeName}"]`)
const listRow = (name: string) => cy.get(`.wishlist-list[data-list-name="${name}"]`)

function openItem(name: string) {
  itemRow(name).click()
  cy.get('#wishlist-panel-name').should('have.text', name)
}

function confirmDelete() {
  cy.get('button').contains('Sim, desejo excluir').click()
}

// An item with two stores: Amazon R$ 599 then R$ 549, and Magalu R$ 529 (AE7).
function createGeladeira(extra: object = {}) {
  cy.createWishlistItem({ name: 'Geladeira', ...extra }).then(itemId => {
    cy.createWishlistLink(itemId, { url: 'https://www.amazon.com.br/geladeira', storeName: 'Amazon' }).then(amazonId => {
      cy.addWishlistPrice(amazonId, 599)
      cy.addWishlistPrice(amazonId, 549)
    })
    cy.createWishlistLink(itemId, { url: 'https://www.magazineluiza.com.br/geladeira', storeName: 'Magalu' }).then(magaluId => {
      cy.addWishlistPrice(magaluId, 529)
    })
  })
}

// An active item with a category, one link and one price.
function createPricedItem(name: string, price: number | null, categoryId?: string) {
  cy.createWishlistItem({ name, ...(categoryId && { categoryId }) }).then(itemId => {
    if (price === null) return
    cy.createWishlistLink(itemId, { url: 'https://www.amazon.com.br/produto', storeName: 'Amazon' }).then(linkId => {
      cy.addWishlistPrice(linkId, price)
    })
  })
}

// A Select with a single option cannot be picked by a click: Radix places that
// option exactly over the trigger and ignores a pointer-up that has not moved.
// The Dashboard forms are therefore given two options, and the last is picked.
function selectLastOption(id: string) {
  cy.get(`#${id}`).click()
  cy.get('[role="option"]').last().click()
  cy.get('[role="listbox"]').should('not.exist')
}

function openDashboardForm(menuItem: string) {
  cy.get('.fixed.bottom-4 button').click()
  cy.contains('[role="menuitem"]', menuItem).click()
  cy.get('[role="menu"]').should('not.exist')
}

const daysFromToday = (days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, 12)
const saoPauloDay = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)

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

type ApiItem = { id: string, name: string, plannedMonth: string | null, plannedDay: number | null, nextReminder: string | null, status: string }

function withItems(build: (items: ApiItem[]) => void) {
  cy.apiRequest('GET', '/wishlist/items').then(response => {
    build(response.body as unknown as ApiItem[])
  })
}

// The API refuses an item whose reminder has already arrived (R15), so the
// reminder window is fed by the real items it would have returned (KTD17).
// The actions still hit the real rows.
function stubReminders(names: string[]) {
  withItems(items => {
    const reminders = names.map(name => ({ ...items.find(item => item.name === name)!, wishlistName: 'Geral' }))
    cy.intercept('GET', '**/wishlist/reminders', { body: reminders })
  })
}

function visitHome() {
  cy.visit('http://localhost:5173/')
  cy.get('nav').should('be.visible')
}

const reminderName = () => cy.get('#wishlist-reminder-name')

// The stub outlives cy.visit, so it is emptied once the queue was answered,
// as the real API would no longer return the resolved items.
function clearReminderStub() {
  cy.intercept('GET', '**/wishlist/reminders', { body: [] })
}

describe('Wishlist', () => {
  it('keeps the Dashboard new expense and new income forms working', () => {
    signUp()
    cy.createBankAccount('Inter')
    cy.createBankAccount('Nubank')

    cy.reload()
    openDashboardForm('Nova despesa')
    cy.get('[role="dialog"]').contains('Nova Despesa')
    cy.get('#transactionValue').clear().type('50')
    cy.get('#name').type('Mercado')
    selectLastOption('transactionCategoryId')
    selectLastOption('transactionBankAccountId')
    cy.get('#transactionSubmit').click()
    cy.contains('Despesa cadastrada com sucesso!')
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('[role="button"]', 'Mercado').invoke('text').should('match', brl('50,00'))

    openDashboardForm('Nova receita')
    cy.get('[role="dialog"]').contains('Nova Receita')
    cy.get('#transactionValue').clear().type('200')
    cy.get('#name').type('Freelance')
    selectLastOption('transactionCategoryId')
    selectLastOption('transactionBankAccountId')
    cy.get('#transactionSubmit').click()
    cy.contains('Receita cadastrada com sucesso!')
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('[role="button"]', 'Freelance').invoke('text').should('match', brl('200,00'))
  })

  it('creates a list, an item with category and planned month, links with the suggested store and prices, showing the lowest (F1)', () => {
    signUp()
    visitWishlist()
    cy.get('#wishlist-empty-list').should('be.visible')

    cy.get('#wishlist-new-list').click()
    cy.get('#wishlistListName').type('Casa nova')
    cy.get('#wishlistListSubmit').click()
    cy.contains('Lista criada com sucesso!')
    listRow('Casa nova').find('button').first().should('have.attr', 'aria-pressed', 'true')
    cy.get('#wishlist-empty-list').should('be.visible')

    cy.get('#wishlist-empty-new-item').click()
    cy.get('#wishlistItemPlannedDay').should('be.disabled')
    cy.get('#wishlistItemName').type('Geladeira')
    selectOption('wishlistItemCategoryId', 'Compras')
    cy.get('#wishlistItemPlannedMonth').type(monthKeyOf(monthAt(2)))
    cy.get('#wishlistItemPlannedDay').should('be.enabled')
    cy.get('#wishlistItemSubmit').click()
    cy.contains('Item criado com sucesso!')

    openItem('Geladeira')
    cy.get('#wishlist-links-empty').should('be.visible')
    cy.get('.wishlist-item').first().should('contain', 'Compras').and('contain', monthLabelOf(monthAt(2)))

    cy.get('#wishlist-add-link').click()
    cy.get('#wishlistLinkUrl').type('https://www.magazineluiza.com.br/geladeira/p/123')
    cy.get('#wishlistLinkStoreName').should('have.value', 'magazineluiza.com.br')
    cy.get('#wishlistLinkSubmit').click()
    cy.contains('Link adicionado!')

    linkCard('magazineluiza.com.br').find('.wishlist-link-price').should('have.text', 'Sem preço')
    linkCard('magazineluiza.com.br').find('.wishlist-add-price').click()
    cy.get('#wishlistPriceValue').clear().type('529')
    cy.get('#wishlistPriceSubmit').click()
    cy.contains('Preço registrado!')
    linkCard('magazineluiza.com.br').find('.wishlist-link-price').invoke('text').should('match', brl('529,00'))

    cy.get('#wishlist-add-link').click()
    cy.get('#wishlistLinkUrl').type('https://www.amazon.com.br/geladeira')
    cy.get('#wishlistLinkStoreName').should('have.value', 'amazon.com.br')
    cy.get('#wishlistLinkSubmit').click()
    cy.contains('Link adicionado!')
    linkCard('amazon.com.br').find('.wishlist-add-price').click()
    cy.get('#wishlistPriceValue').clear().type('549')
    cy.get('#wishlistPriceSubmit').click()
    cy.contains('Preço registrado!')

    cy.get('.wishlist-item .wishlist-item-price').invoke('text').should('match', brl('529,00'))
    cy.get('.wishlist-item .wishlist-item-price').should('contain', 'magazineluiza.com.br')
    cy.get('.wishlist-lowest-value').invoke('text').should('match', brl('529,00'))
  })

  it('puts an item created without choosing a list in Geral', () => {
    signUp()
    cy.createWishlistList('Casa nova')
    visitWishlist()

    cy.get('#wishlist-list-all').should('have.attr', 'aria-pressed', 'true')
    cy.get('#wishlist-new-item').click()
    cy.get('#wishlistItemName').type('Fone')
    cy.get('#wishlistItemSubmit').click()
    cy.contains('Item criado com sucesso!')

    itemRow('Fone').should('contain', 'Geral')
    listRow('Casa nova').find('button').first().click()
    cy.get('#wishlist-empty-list').should('be.visible')
    listRow('Geral').find('button').first().click()
    itemRow('Fone').should('be.visible')
  })

  it('shows the lowest price, the variation and the history of each link (AE7)', () => {
    signUp()
    createGeladeira()
    visitWishlist()

    openItem('Geladeira')
    cy.get('.wishlist-lowest-value').invoke('text').should('match', brl('529,00'))
    cy.get('.wishlist-lowest-store').should('contain', 'Magalu')
    linkCard('Magalu').find('.wishlist-link-price').invoke('text').should('match', brl('529,00'))
    linkCard('Magalu').find('.wishlist-link-variation').should('not.exist')
    linkCard('Amazon').find('.wishlist-link-price').invoke('text').should('match', brl('549,00'))
    linkCard('Amazon').find('.wishlist-link-variation').invoke('text').should('match', /-R\$\s50,00/)
    linkCard('Amazon').find('.wishlist-price-value').should('have.length', 2)
    linkCard('Amazon').find('.wishlist-price-value').first().invoke('text').should('match', brl('599,00'))
    linkCard('Amazon').find('.wishlist-price-value').last().invoke('text').should('match', brl('549,00'))
    linkCard('Amazon').find('.wishlist-link-store')
      .should('have.attr', 'target', '_blank')
      .and('have.attr', 'rel', 'noopener noreferrer')
  })

  it('moves the lowest price to the other store when the wrong record is deleted (AE8)', () => {
    signUp()
    createGeladeira()
    visitWishlist()

    openItem('Geladeira')
    linkCard('Magalu').find('.wishlist-price-delete').click()
    confirmDelete()
    cy.contains('Registro de preço excluído!')

    linkCard('Magalu').find('.wishlist-link-price').should('have.text', 'Sem preço')
    cy.get('.wishlist-lowest-value').invoke('text').should('match', brl('549,00'))
    cy.get('.wishlist-lowest-store').should('contain', 'Amazon')
  })

  it('moves the items of a deleted list to Geral, each in its own state, and never offers to delete Geral (AE11)', () => {
    signUp()
    cy.createWishlistList('Natal').then(natalId => {
      cy.createWishlistItem({ name: 'Perfume', wishlistId: natalId })
      cy.createWishlistItem({ name: 'Livro', wishlistId: natalId })
      cy.createWishlistItem({ name: 'Cachecol', wishlistId: natalId }).then(itemId => {
        cy.apiRequest('POST', `/wishlist/items/${itemId}/purchase`, { paidValue: 80, paidDate: noonUtc(today) })
          .its('status').should('eq', 201)
      })
    })
    visitWishlist()

    listRow('Geral').find('.wishlist-list-menu').click()
    cy.contains('[role="menuitem"]', 'Renomear').should('be.visible')
    cy.contains('[role="menuitem"]', 'Excluir').should('not.exist')
    cy.get('body').type('{esc}')

    listRow('Natal').find('button').first().click()
    itemRow('Perfume').should('be.visible')
    listRow('Natal').find('.wishlist-list-menu').click()
    cy.contains('[role="menuitem"]', 'Excluir').click()
    confirmDelete()
    cy.contains('Lista excluída!')

    cy.get('.wishlist-list[data-list-name="Natal"]').should('not.exist')
    listRow('Geral').find('button').first().should('have.attr', 'aria-pressed', 'true')
    itemRow('Perfume').should('be.visible')
    itemRow('Livro').should('be.visible')
    cy.contains('.wishlist-item', 'Cachecol').should('not.exist')
    cy.get('#wishlist-status-purchased').click()
    itemRow('Cachecol').should('be.visible')
    cy.get('.wishlist-item').should('have.length', 1)
  })

  it('renames a list', () => {
    signUp()
    visitWishlist()

    listRow('Geral').find('.wishlist-list-menu').click()
    cy.contains('[role="menuitem"]', 'Renomear').click()
    cy.get('#wishlistListName').should('have.value', 'Geral').clear().type('Diversos')
    cy.get('#wishlistListSubmit').click()
    cy.contains('Lista renomeada!')
    listRow('Diversos').should('be.visible')
  })

  it('gives up an item keeping its links, and reactivates it', () => {
    signUp()
    createGeladeira()
    visitWishlist()

    openItem('Geladeira')
    cy.get('#wishlist-give-up').click()
    cy.contains('Item movido para Desistidos.')
    cy.get('#wishlist-empty-filter').should('be.visible')
    cy.get('#wishlist-panel-empty').should('be.visible')

    cy.get('#wishlist-status-gave-up').click()
    openItem('Geladeira')
    cy.get('#wishlist-panel-gave-up').should('be.visible')
    cy.get('#wishlist-buy').should('not.exist')
    linkCard('Amazon').find('.wishlist-link-price').invoke('text').should('match', brl('549,00'))
    linkCard('Magalu').find('.wishlist-link-price').invoke('text').should('match', brl('529,00'))

    cy.get('#wishlist-reactivate').click()
    cy.contains('Item reativado!')
    cy.get('#wishlist-empty-filter').should('be.visible')

    cy.get('#wishlist-status-active').click()
    itemRow('Geladeira').should('be.visible')
  })

  it('edits and deletes an item, clearing the panel', () => {
    signUp()
    createPricedItem('Mouse', 100)
    visitWishlist()

    openItem('Mouse')
    cy.get('#wishlist-edit').click()
    cy.get('#wishlistItemName').should('have.value', 'Mouse').clear().type('Mouse sem fio')
    cy.get('#wishlistItemSubmit').click()
    cy.contains('Item atualizado!')
    cy.get('#wishlist-panel-name').should('have.text', 'Mouse sem fio')

    cy.get('#wishlist-delete').click()
    confirmDelete()
    cy.contains('Item excluído!')
    cy.get('#wishlist-panel-empty').should('be.visible')
    cy.get('#wishlist-empty-list').should('be.visible')
  })

  it('lists the items with a date first, the nearest first, then the ones without', () => {
    signUp()
    cy.createWishlistItem({ name: 'Sem data' })
    cy.createWishlistItem({ name: 'Mais longe', plannedMonth: monthKeyOf(monthAt(3)) })
    cy.createWishlistItem({ name: 'Mais perto', plannedMonth: monthKeyOf(monthAt(1)), plannedDay: 20 })
    cy.createWishlistItem({ name: 'No meio', plannedMonth: monthKeyOf(monthAt(2)) })
    visitWishlist()

    cy.get('.wishlist-item-name').then($names => {
      expect([...$names].map(name => name.textContent)).to.deep.eq(['Mais perto', 'No meio', 'Mais longe', 'Sem data'])
    })
    itemRow('Sem data').should('contain', 'sem data')
    itemRow('Mais perto').should('contain', `20/${monthKeyOf(monthAt(1)).slice(5)}/${monthAt(1).getFullYear()}`)
  })

  it('joins the items of every list in Todas', () => {
    signUp()
    cy.createWishlistList('Casa nova').then(listId => {
      cy.createWishlistItem({ name: 'Sofá', wishlistId: listId })
    })
    cy.createWishlistItem({ name: 'Fone' })
    visitWishlist()

    cy.get('.wishlist-item').should('have.length', 2)
    itemRow('Sofá').should('contain', 'Casa nova')
    itemRow('Fone').should('contain', 'Geral')

    listRow('Casa nova').find('button').first().click()
    cy.get('.wishlist-item').should('have.length', 1)
    itemRow('Sofá').should('be.visible')
    cy.get('#wishlist-list-all').click()
    cy.get('.wishlist-item').should('have.length', 2)
  })

  it('does not count an item of the wishlist in the balance nor in the category totals (AE13)', () => {
    signUp()
    cy.createBankAccount('Nubank')
    withCategory('shopping', categoryId => {
      cy.createWishlistItem({ name: 'Air fryer', categoryId, plannedMonth: monthKeyOf(today) }).then(itemId => {
        cy.createWishlistLink(itemId, { url: 'https://www.amazon.com.br/air-fryer', storeName: 'Amazon' }).then(linkId => {
          cy.addWishlistPrice(linkId, 529)
        })
      })
    })

    visitWishlist()
    openItem('Air fryer')
    cy.get('.wishlist-lowest-value').invoke('text').should('match', brl('529,00'))

    visitApp('/')
    cy.contains('span', 'Saldo total').siblings('div').find('strong').invoke('text').should('match', brl('1.000,00'))

    visitApp('/categorias')
    cy.get('.category-total').should('have.length.greaterThan', 0)
    cy.get('.category-total').each($total => {
      expect($total.text()).to.match(brl('0,00'))
    })
  })

  it('opens the card purchase prefilled from the item, saves it with other values and marks the item as bought, keeping the paid value when the purchase is deleted (AE9, AE10)', () => {
    signUp()
    cy.createBankAccount('Itaú')
    cy.createCard(monthlyCard('Nubank')).then(cardId => {
      withCategory('shopping', categoryId => {
        createPricedItem('Air fryer', 529, categoryId)
      })
      visitWishlist()

      openItem('Air fryer')
      cy.get('#wishlist-buy').click()
      cy.get('#purchase-kind-card').click()
      cy.get('#entryDescription').should('have.value', 'Air fryer')
      cy.get('#entryValue').invoke('val').should('match', /^529,00$/)
      cy.get('#entryCategoryId').should('contain', 'Compras')
      cy.get('#entryDate').should('contain', todayLabel)

      cy.get('#entryValue').clear().type('499')
      cy.contains('[role="tab"]', 'Parcelada').click()
      cy.get('#entryInstallmentsCount').type('3')
      cy.get('#entrySubmit').click()
      cy.contains('Lançamento registrado!')

      cy.get('#wishlist-empty-filter').should('be.visible')
      cy.get('#wishlist-status-purchased').click()
      itemRow('Air fryer').find('.wishlist-item-paid').invoke('text').should('match', brl('499,00'))
      itemRow('Air fryer').find('.wishlist-item-paid').should('contain', todayLabel)

      visitApp('/cartoes')
      cy.get('a[data-card-name="Nubank"] .card-available').invoke('text').should('match', brl('9.501,00'))

      cy.apiRequest('GET', `/cards/${cardId}`).then(response => {
        const card = response.body as unknown as { invoices: { entries: { description: string, purchaseId: string | null }[] }[] }
        const entry = card.invoices.flatMap(invoice => invoice.entries).find(item => item.description === 'Air fryer')!
        cy.apiRequest('DELETE', `/cards/${cardId}/purchases/${entry.purchaseId}`).its('status').should('be.lessThan', 300)
      })
      visitApp('/cartoes')
      cy.get('a[data-card-name="Nubank"] .card-available').invoke('text').should('match', brl('10.000,00'))

      visitWishlist()
      cy.get('#wishlist-status-purchased').click()
      itemRow('Air fryer').find('.wishlist-item-paid').invoke('text').should('match', brl('499,00'))
    })
  })

  it('opens the expense form prefilled from the item and keeps the item active when it is cancelled', () => {
    signUp()
    cy.createBankAccount('Itaú')
    createPricedItem('Air fryer', 529)
    visitWishlist()

    openItem('Air fryer')
    cy.get('#wishlist-buy').click()
    cy.get('#purchase-kind-account').click()
    cy.get('#name').should('have.value', 'Air fryer')
    cy.get('#transactionValue').invoke('val').should('match', /^529,00$/)
    cy.get('[role="dialog"] header button').first().click()
    cy.get('[role="dialog"]').should('not.exist')

    cy.get('#wishlist-status-purchased').click()
    cy.get('#wishlist-empty-filter').should('be.visible')
    cy.get('#wishlist-status-active').click()
    itemRow('Air fryer').should('be.visible')
  })

  it('opens the expense form with an empty value for an item without a price', () => {
    signUp()
    cy.createBankAccount('Itaú')
    createPricedItem('Livro', null)
    visitWishlist()

    openItem('Livro')
    cy.get('#wishlist-buy').click()
    cy.get('#purchase-kind-account').click()
    cy.get('#name').should('have.value', 'Livro')
    cy.get('#transactionValue').should('have.value', '')
  })

  it('warns instead of opening a form when there is no account nor card', () => {
    signUp()
    createPricedItem('Livro', 40)
    visitWishlist()

    openItem('Livro')
    cy.get('#wishlist-buy').click()
    cy.get('#purchase-kind-empty').should('be.visible')
    cy.get('#transactionValue').should('not.exist')
    cy.get('#entryValue').should('not.exist')
    cy.get('#purchase-kind-close').click()
    itemRow('Livro').should('be.visible')
  })

  it('shows the limit screen when the purchase exceeds the card limit, with the item already bought', () => {
    signUp()
    cy.createCard(monthlyCard('Nubank', 100))
    withCategory('shopping', categoryId => {
      createPricedItem('Cadeira', 150, categoryId)
    })
    visitWishlist()

    openItem('Cadeira')
    cy.get('#wishlist-buy').click()
    cy.get('#purchase-kind-card').click()
    cy.get('#entryValue').invoke('val').should('match', /^150,00$/)
    cy.get('#entrySubmit').click()

    cy.get('#limit-warning').invoke('text').should('match', /-R\$\s50,00/)
    cy.get('button').contains('Entendi').click()
    cy.get('#wishlist-status-purchased').click()
    itemRow('Cadeira').find('.wishlist-item-paid').invoke('text').should('match', brl('150,00'))
  })

  it('shows the purchase reminder after the invoice one, with the item data and the store links (AE1)', () => {
    signUp()
    cy.createBankAccount('Itaú')
    cy.createCard(closingSoonCard('Nubank')).then(cardId => {
      withCategory('food', categoryId => {
        cy.createCardPurchase(cardId, {
          kind: 'PURCHASE',
          description: 'Mercado',
          value: 1230,
          date: daysFromToday(-3).toISOString(),
          categoryId
        })
      })
    })
    withCategory('shopping', categoryId => {
      cy.createWishlistItem({ name: 'Air fryer', categoryId, plannedMonth: monthKeyOf(monthAt(1)) }).then(itemId => {
        cy.createWishlistLink(itemId, { url: 'https://www.amazon.com.br/air-fryer', storeName: 'Amazon' }).then(linkId => {
          cy.addWishlistPrice(linkId, 529)
        })
      })
    })
    stubReminders(['Air fryer'])

    visitHome()
    cy.get('#invoice-reminder-card').should('have.text', 'Nubank')
    reminderName().should('not.exist')
    cy.get('#invoice-reminder-later').click()

    reminderName().should('have.text', 'Air fryer')
    cy.get('#wishlist-reminder-list').should('have.text', 'Geral')
    cy.get('#wishlist-reminder-category').should('have.text', 'Compras')
    cy.get('#wishlist-reminder-planned').should('have.text', monthLabelOf(monthAt(1)))
    cy.get('#wishlist-reminder-price').invoke('text').should('match', brl('529,00'))
    cy.get('#wishlist-reminder-price-store').should('contain', 'Amazon').and('contain', todayLabel)
    cy.get('.wishlist-reminder-link')
      .should('have.attr', 'href', 'https://www.amazon.com.br/air-fryer')
      .and('have.attr', 'target', '_blank')
    cy.get('#wishlist-reminder-keep').should('not.exist')
  })

  it('does not bring a closed purchase reminder back until the app is opened again (AE6)', () => {
    signUp()
    cy.createWishlistItem({ name: 'Air fryer', plannedMonth: monthKeyOf(monthAt(1)) })
    stubReminders(['Air fryer'])

    visitHome()
    reminderName().should('have.text', 'Air fryer')
    cy.get('[role="dialog"] header button').first().click()
    reminderName().should('not.exist')

    cy.get('nav').contains('Metas').click()
    cy.get('nav').contains('Wishlist').click()
    cy.get('#wishlist-lists').should('be.visible')
    cy.get('nav').contains('Dashboard').click()
    reminderName().should('not.exist')

    cy.reload()
    reminderName().should('have.text', 'Air fryer')
  })

  it('suggests the next month when postponing, and plans the item for it without a day (AE5)', () => {
    signUp()
    cy.createWishlistItem({ name: 'Air fryer', plannedMonth: monthKeyOf(monthAt(0)) })
    stubReminders(['Air fryer'])

    visitHome()
    reminderName().should('have.text', 'Air fryer')
    cy.get('#wishlist-reminder-postpone').click()
    cy.get('#wishlist-reminder-month').should('have.value', monthKeyOf(monthAt(1)))
    cy.get('#wishlist-reminder-day').should('have.value', '')

    cy.get('#wishlist-reminder-postpone-back').click()
    reminderName().should('have.text', 'Air fryer')
    cy.get('#wishlist-reminder-postpone').click()
    cy.get('#wishlist-reminder-postpone-confirm').click()
    cy.contains('Item adiado!')
    reminderName().should('not.exist')

    withItems(items => {
      const item = items.find(({ name }) => name === 'Air fryer')!
      expect(item.plannedMonth).to.eq(monthKeyOf(monthAt(1)))
      expect(item.plannedDay).to.eq(null)
      expect(item.nextReminder!.slice(0, 10)).to.eq(`${monthKeyOf(monthAt(1))}-01`)
    })
  })

  it('asks if the user still wants an item without a date, and asks again in 30 days (F3)', () => {
    signUp()
    cy.createWishlistItem({ name: 'Livro' })
    stubReminders(['Livro'])

    visitHome()
    reminderName().should('have.text', 'Livro')
    cy.get('#wishlist-reminder-planned').should('have.text', 'sem data')
    cy.get('#wishlist-reminder-keep').click()
    cy.contains('Combinado!')
    reminderName().should('not.exist')

    withItems(items => {
      const item = items.find(({ name }) => name === 'Livro')!
      expect(item.status).to.eq('ACTIVE')
      expect(item.nextReminder!.slice(0, 10)).to.eq(saoPauloDay(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)))
    })
  })

  it('brings the same reminder back when the purchase form is cancelled, and moves to the next item once it is saved', () => {
    signUp()
    cy.createBankAccount('Itaú')
    cy.createBankAccount('Inter')
    withCategory('shopping', categoryId => {
      createPricedItem('Air fryer', 529, categoryId)
      createPricedItem('Livro', 40, categoryId)
    })
    stubReminders(['Air fryer', 'Livro'])

    visitHome()
    reminderName().should('have.text', 'Air fryer')
    cy.get('#wishlist-reminder-bought').click()
    reminderName().should('not.exist')
    cy.get('#purchase-kind-account').click()
    cy.get('#name').should('have.value', 'Air fryer')
    cy.get('#transactionValue').invoke('val').should('match', /^529,00$/)
    cy.get('[role="dialog"] header button').first().click()
    // Cancelling closes the form and brings the reminder window back (KTD7).
    cy.get('#transactionSubmit').should('not.exist')
    reminderName().should('have.text', 'Air fryer')

    cy.get('#wishlist-reminder-bought').click()
    cy.get('#purchase-kind-account').click()
    selectLastOption('transactionBankAccountId')
    cy.get('#transactionSubmit').click()
    cy.contains('Despesa cadastrada com sucesso!')
    reminderName().should('have.text', 'Livro')

    cy.get('#wishlist-reminder-give-up').click()
    reminderName().should('not.exist')

    clearReminderStub()
    visitWishlist()
    cy.get('#wishlist-status-purchased').click()
    itemRow('Air fryer').find('.wishlist-item-paid').invoke('text').should('match', brl('529,00'))
  })

  it('moves the item to Desistidos when the user gives up from the reminder', () => {
    signUp()
    cy.createWishlistItem({ name: 'Livro' })
    stubReminders(['Livro'])

    visitHome()
    reminderName().should('have.text', 'Livro')
    cy.get('#wishlist-reminder-give-up').click()
    cy.contains('Item movido para Desistidos.')
    reminderName().should('not.exist')

    clearReminderStub()
    visitWishlist()
    cy.get('#wishlist-status-gave-up').click()
    itemRow('Livro').should('be.visible')
  })

  it('moves on without an error when the item was already resolved elsewhere (409)', () => {
    signUp()
    cy.createWishlistItem({ name: 'Primeira' }).then(itemId => {
      cy.createWishlistItem({ name: 'Segunda' })
      stubReminders(['Primeira', 'Segunda'])

      visitHome()
      reminderName().should('have.text', 'Primeira')
      cy.apiRequest('POST', `/wishlist/items/${itemId}/give-up`).its('status').should('be.lessThan', 300)

      cy.get('#wishlist-reminder-keep').click()
      reminderName().should('have.text', 'Segunda')
      cy.contains('Não foi possível registrar a resposta').should('not.exist')
    })
  })
})
