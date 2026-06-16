describe("mobile calendar", () => {
  beforeEach(() => {
    cy.viewport(375, 812);
    cy.login();
    cy.visit("/dashboard");
    cy.get('[aria-label="Toggle menu"]').click();
    cy.contains("a", "Calendar").click();
  });

  it("defaults to day view on a phone", () => {
    // The day toggle is rendered as the active segment in the header control.
    cy.contains("button", "day").should("exist");
  });

  it("hides the desktop mini-calendar rail on mobile", () => {
    // The rail is `hidden md:block`, so its month controls are not visible at 375px.
    cy.get('[aria-label="Next month"]').should("not.be.visible");
  });

  it("does not show a 336px side editor (editor is a bottom sheet)", () => {
    cy.get("aside").should("not.exist");
  });
});
