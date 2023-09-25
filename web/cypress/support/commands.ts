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
  }
}

Cypress.Commands.add('register', (name, email, password) => {
  cy.visit('http://localhost:5173/register')

  cy.get('#name').type(name as string)
  cy.get('#email').type(email)
  cy.get('#password').type(password)
  cy.get('button').contains('Criar conta').click()
})
