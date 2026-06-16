describe("calendar (desktop)", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/dashboard");
    cy.contains("a", "Calendar").click();
  });

  it("shows the mini-calendar rail when idle", () => {
    // The left rail renders a month navigator with prev/next controls.
    cy.get('[aria-label="Next month"]').should("be.visible");
    cy.get('[aria-label="Previous month"]').should("be.visible");
  });

  it("renders a time grid with hour labels", () => {
    cy.get(".overflow-y-scroll").should("exist");
    cy.contains(/\b(7|8|9|10|11|12)\b/).should("exist");
  });

  it("does not show the event editor until an event is opened", () => {
    cy.get("aside").should("not.exist");
  });
});
