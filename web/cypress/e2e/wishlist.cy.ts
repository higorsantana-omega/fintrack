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

function selectFirstOption(id: string) {
  cy.get(`#${id}`).click()
  cy.get('[role="option"]').first().click()
}

function openDashboardForm(menuItem: string) {
  cy.get('.fixed.bottom-4 button').click()
  cy.contains('[role="menuitem"]', menuItem).click()
}

describe('Wishlist', () => {
  it('keeps the Dashboard new expense and new income forms working', () => {
    signUp()
    cy.createBankAccount('Nubank')

    cy.reload()
    openDashboardForm('Nova despesa')
    cy.get('[role="dialog"]').contains('Nova Despesa')
    cy.get('#transactionValue').clear().type('50')
    cy.get('#name').type('Mercado')
    selectFirstOption('transactionCategoryId')
    selectFirstOption('transactionBankAccountId')
    cy.get('#transactionSubmit').click()
    cy.contains('Despesa cadastrada com sucesso!')
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('[role="button"]', 'Mercado').invoke('text').should('match', brl('50,00'))

    openDashboardForm('Nova receita')
    cy.get('[role="dialog"]').contains('Nova Receita')
    cy.get('#transactionValue').clear().type('200')
    cy.get('#name').type('Freelance')
    selectFirstOption('transactionCategoryId')
    selectFirstOption('transactionBankAccountId')
    cy.get('#transactionSubmit').click()
    cy.contains('Receita cadastrada com sucesso!')
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('[role="button"]', 'Freelance').invoke('text').should('match', brl('200,00'))
  })
})
