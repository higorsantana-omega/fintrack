/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Cypress {
  interface Chainable {
    register(name: string, email: string, password: string): Chainable
    apiRequest(method: string, path: string, body?: object): Chainable<Cypress.Response<{ id: string }>>
    createBankAccount(name: string, initialBalance?: number): Chainable<string>
    createGoal(params: object): Chainable<string>
    createCard(params: object): Chainable<string>
    createCardPurchase(cardId: string, params: object): Chainable<string>
    payInvoice(cardId: string, month: string, params: object): Chainable<string>
    createDebt(params: object): Chainable<string>
    payDebt(debtId: string, params: object): Chainable<string>
    createBorrower(params: object): Chainable<string>
    createBorrowerMovement(borrowerId: string, params: object): Chainable<string>
  }
}

Cypress.Commands.add('register', (name, email, password) => {
  cy.visit('http://localhost:5173/register')

  cy.get('#name').type(name as string)
  cy.get('#email').type(email)
  cy.get('#password').type(password)
  cy.get('button').contains('Criar conta').click()
})

Cypress.Commands.add('apiRequest', (method, path, body) => {
  return cy.window().its('localStorage').invoke('getItem', '@fintrack:accessToken').then(token => {
    return cy.request({
      method,
      url: `http://localhost:3000${path}`,
      body,
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false
    })
  })
})

Cypress.Commands.add('createBankAccount', (name, initialBalance = 1000) => {
  return cy.apiRequest('POST', '/bank-accounts', {
    name,
    initialBalance,
    type: 'CHECKING',
    color: '#7950F2'
  }).then(response => {
    expect(response.status).to.eq(201)
    return response.body.id
  })
})

Cypress.Commands.add('createGoal', params => {
  return cy.apiRequest('POST', '/goals', params).then(response => {
    expect(response.status).to.eq(201)
    return response.body.id
  })
})

Cypress.Commands.add('createCard', params => {
  return cy.apiRequest('POST', '/cards', params).then(response => {
    expect(response.status).to.eq(201)
    return response.body.id
  })
})

Cypress.Commands.add('createCardPurchase', (cardId, params) => {
  return cy.apiRequest('POST', `/cards/${cardId}/purchases`, params).then(response => {
    expect(response.status).to.eq(201)
    return response.body.id
  })
})

Cypress.Commands.add('payInvoice', (cardId, month, params) => {
  return cy.apiRequest('POST', `/cards/${cardId}/invoices/${month}/payments`, params).then(response => {
    expect(response.status).to.eq(201)
    return response.body.id
  })
})

Cypress.Commands.add('createDebt', params => {
  return cy.apiRequest('POST', '/debts', params).then(response => {
    expect(response.status).to.eq(201)
    return response.body.id
  })
})

Cypress.Commands.add('payDebt', (debtId, params) => {
  return cy.apiRequest('POST', `/debts/${debtId}/payments`, params).then(response => {
    expect(response.status).to.eq(201)
    return response.body.id
  })
})

Cypress.Commands.add('createBorrower', params => {
  return cy.apiRequest('POST', '/borrowers', params).then(response => {
    expect(response.status).to.eq(201)
    return response.body.id
  })
})

Cypress.Commands.add('createBorrowerMovement', (borrowerId, params) => {
  return cy.apiRequest('POST', `/borrowers/${borrowerId}/movements`, params).then(response => {
    expect(response.status).to.eq(201)
    return response.body.id
  })
})
