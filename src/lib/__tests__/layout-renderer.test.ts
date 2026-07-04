import { describe, it, expect } from "vitest";
import { parseExpression, renderLayout } from "../layout-renderer";

describe("parseExpression", () => {
  const data = { salePrice: 100, purchasePrice: 60, itemName: "Monitor" };
  const fields = ["salePrice", "purchasePrice", "itemName"];

  it("resolves a simple field reference", () => {
    expect(parseExpression("salePrice", data, fields)).toBe("100");
  });

  it("resolves a text field", () => {
    expect(parseExpression("itemName", data, fields)).toBe("Monitor");
  });

  it("evaluates arithmetic: subtraction", () => {
    expect(parseExpression("salePrice - purchasePrice", data, fields)).toBe("40");
  });

  it("evaluates arithmetic: addition", () => {
    expect(parseExpression("salePrice + purchasePrice", data, fields)).toBe("160");
  });

  it("evaluates arithmetic: multiplication", () => {
    expect(parseExpression("salePrice * 2", data, fields)).toBe("200");
  });

  it("returns empty string for unknown field", () => {
    expect(parseExpression("unknownField", data, fields)).toBe("");
  });

  it("rejects function calls", () => {
    expect(parseExpression("alert(1)", data, fields)).toBe("");
  });

  it("rejects property chains beyond entry.x", () => {
    expect(parseExpression("window.location", data, fields)).toBe("");
  });
});

describe("renderLayout", () => {
  const fields = [
    { key: "salePrice", label: "Sale Price", type: "number" as const },
    { key: "itemName", label: "Item", type: "text" as const },
    { key: "purchasePrice", label: "Purchase Price", type: "number" as const },
  ];

  it("interpolates simple field values", () => {
    const html = '<div>{salePrice}</div>';
    const data = { salePrice: 250 };
    const result = renderLayout(html, data, fields);
    expect(result).toContain("250");
    expect(result).not.toContain("{salePrice}");
  });

  it("interpolates arithmetic expressions", () => {
    const html = '<div>{salePrice - purchasePrice}</div>';
    const data = { salePrice: 250, purchasePrice: 100 };
    const result = renderLayout(html, data, fields);
    expect(result).toContain("150");
  });

  it("expands data-each loops", () => {
    const html = '<div data-each="entries"><span>{entry.itemName}</span></div>';
    const entries = [
      { itemName: "Monitor A", salePrice: 200 },
      { itemName: "Monitor B", salePrice: 300 },
    ];
    const result = renderLayout(html, {}, fields, entries);
    expect(result).toContain("Monitor A");
    expect(result).toContain("Monitor B");
    expect(result).not.toContain("data-each");
  });

  it("expands data-each with nested same-tag elements without truncating the body", () => {
    const html =
      '<div data-each="entries">' +
      '<div class="card"><div class="head"><span>{entry.itemName}</span></div></div>' +
      '<p class="notes">{entry.notes}</p>' +
      "</div>";
    const entries = [
      { itemName: "Monitor A", notes: "first note" },
      { itemName: "Monitor B", notes: "second note" },
    ];
    const result = renderLayout(html, {}, fields, entries);
    // Every field of every iteration renders — nothing truncated at the
    // first nested </div>.
    expect(result).toContain("Monitor A");
    expect(result).toContain("first note");
    expect(result).toContain("Monitor B");
    expect(result).toContain("second note");
    expect(result).not.toContain("data-each");
    expect(result).not.toContain("{entry.");
    // The trailing <p> stays inside each iteration (after its item's name).
    expect(result.indexOf("first note")).toBeGreaterThan(result.indexOf("Monitor A"));
    expect(result.indexOf("first note")).toBeLessThan(result.indexOf("Monitor B"));
    expect(result.indexOf("second note")).toBeGreaterThan(result.indexOf("Monitor B"));
  });

  it("escapes HTML in values to prevent XSS", () => {
    const html = '<div>{itemName}</div>';
    const data = { itemName: '<script>alert("xss")</script>' };
    const result = renderLayout(html, data, fields);
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("strips event handler attributes", () => {
    const html = '<div onclick="alert(1)">{salePrice}</div>';
    const data = { salePrice: 100 };
    const result = renderLayout(html, data, fields);
    expect(result).not.toContain("onclick");
  });

  it("strips script tags", () => {
    const html = '<script>alert(1)</script><div>{salePrice}</div>';
    const data = { salePrice: 100 };
    const result = renderLayout(html, data, fields);
    expect(result).not.toContain("<script>");
    expect(result).toContain("100");
  });
});
