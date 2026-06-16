/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", () => {
  const email = Cypress.env("TEST_EMAIL");
  const password = Cypress.env("TEST_PASSWORD");
  cy.session([email], () => {
    cy.visit("/login");
    // Login inputs are typed (no name attribute) — select by type.
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password, { log: false });
    cy.get('button[type="submit"]').click();
    cy.location("pathname", { timeout: 15000 }).should("not.include", "/login");
  });
});

export {};
