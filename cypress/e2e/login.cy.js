describe('Login — seguridad', () => {
  it('muestra error con credenciales inválidas', () => {
    cy.visit('/#/login')
    cy.contains('Nutrogan', { timeout: 20000 }).should('be.visible')
    cy.contains('Ganadería de Precisión').should('be.visible')

    cy.get('input[type="email"]').clear().type('hacker@test.com')
    cy.get('input[type="password"]').clear().type('password-incorrecta-xyz')
    cy.get('button[type="submit"]').click()

    cy.get('.error-box', { timeout: 20000 }).should('be.visible')
    cy.contains(/Credenciales inválidas|no autorizado/i).should('be.visible')
    cy.url().should('include', 'login')
  })

  it('exige email y password', () => {
    cy.visit('/#/login')
    cy.get('button[type="submit"]').click()
    cy.contains(/Requerido|Requerida/i).should('be.visible')
  })
})
