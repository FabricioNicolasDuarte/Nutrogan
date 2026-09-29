/**
 * Smoke UI de rutas públicas / login en producción o local.
 * Base: NUTROGAN_BASE_URL (default https://www.nutrogan.site)
 *
 * Rutas autenticadas se validan vía npm run test:smoke (API).
 */
describe('UI smoke — shell pública', () => {
  it('login carga marca y formulario', () => {
    cy.visit('/#/login')
    cy.contains('Nutrogan').should('be.visible')
    cy.get('input[type="email"]').should('exist')
    cy.get('input[type="password"]').should('exist')
    cy.contains('INICIAR SESIÓN').should('be.visible')
  })

  it('ruta inexistente no crashea el shell', () => {
    cy.visit('/#/ruta-que-no-existe-xyz', { failOnStatusCode: false })
    // Quasar ErrorNotFound o redirect — al menos responde HTML
    cy.get('body').should('exist')
  })
})

describe('UI smoke — sesión (opcional)', () => {
  const email = Cypress.env('NUTROGAN_SMOKE_EMAIL') || Cypress.env('email')
  const password = Cypress.env('NUTROGAN_SMOKE_PASSWORD') || Cypress.env('password')

  const hasCreds = !!(email && password)

  ;(hasCreds ? it : it.skip)('login real abre dashboard o modo campo', () => {
    cy.visit('/#/login')
    cy.get('input[type="email"]').clear().type(email)
    cy.get('input[type="password"]').clear().type(password, { log: false })
    cy.get('button[type="submit"]').click()
    cy.url({ timeout: 30000 }).should((url) => {
      expect(url.includes('login')).to.eq(false)
    })
    cy.get('body').should('exist')
  })
})
