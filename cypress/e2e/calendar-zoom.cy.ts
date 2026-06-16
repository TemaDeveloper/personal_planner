describe("calendar zoom (desktop)", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/dashboard");
    cy.contains("a", "Calendar").click();
    // Start from a clean zoom level.
    cy.window().then((w) => w.localStorage.removeItem("lifora.calendar.hourHeight"));
    cy.reload();
    cy.contains("a", "Calendar").click();
  });

  it("Ctrl+wheel zooms the grid and persists the hour height", () => {
    cy.get(".overflow-y-scroll").first().trigger("wheel", {
      deltaY: -120,
      ctrlKey: true,
      bubbles: true,
    });
    cy.window()
      .its("localStorage")
      .invoke("getItem", "lifora.calendar.hourHeight")
      .should("exist");
  });

  it("plain wheel does not change the hour height", () => {
    cy.get(".overflow-y-scroll").first().trigger("wheel", { deltaY: -120, bubbles: true });
    // No ctrlKey → no zoom → no persisted value written by zoom.
    cy.window()
      .its("localStorage")
      .invoke("getItem", "lifora.calendar.hourHeight")
      .should("be.null");
  });
});
