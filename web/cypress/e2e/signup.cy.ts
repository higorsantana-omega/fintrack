function generateName(tamanho) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let name = ''
  for (let i = 0; i < tamanho; i++) {
    name += characters[Math.floor(Math.random() * characters.length)]
  }
  return name
}

function generateEmail() {
  const name = generateName(8)
  const domain = 'example.com'
  return `${name}@${domain}`
}

describe('Signup page', () => {
  it('passes', () => {
    cy.visit('http://localhost:5173/login')

    cy.get('a').contains('Crie sua conta').click()
    cy.get('#name').type('Meu Teste')
    cy.get('#email').type(generateEmail())
    cy.get('#password').type('Red@!Teste')
    cy.get('button').contains('Criar conta').click()
  })
})