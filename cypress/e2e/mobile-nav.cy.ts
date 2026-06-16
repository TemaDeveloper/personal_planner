describe("mobile nav", () => {
  beforeEach(() => {
    cy.viewport(375, 812);
    cy.login();
    cy.visit("/dashboard");
  });

  it("has no bottom tab bar", () => {
    cy.get("nav.fixed.bottom-0").should("not.exist");
  });

  it("opens the grouped dropdown from the hamburger and navigates", () => {
    cy.get('[aria-label="Toggle menu"]').click();
    cy.contains("Money").should("be.visible");
    cy.contains("a", "Settings").click();
    cy.location("pathname").should("eq", "/settings");
  });
});
