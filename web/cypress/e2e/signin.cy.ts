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

describe('Signin page', () => {
  it('passes', () => {
    const email = generateEmail()
    const password = 'Red@Mod1'
    cy.register('teste', email, password)

    cy.visit('http://localhost:5173/login')
    cy.get('#email').type(email)
    cy.get('#password').type(password)
    cy.get('button').contains('Entrar').click()

  })
})