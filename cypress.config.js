import { defineConfig } from 'cypress'

const baseUrl =
  process.env.NUTROGAN_BASE_URL ||
  process.env.CYPRESS_BASE_URL ||
  'https://www.nutrogan.site'

export default defineConfig({
  e2e: {
    baseUrl,
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,
    setupNodeEvents() {},
  },
})
