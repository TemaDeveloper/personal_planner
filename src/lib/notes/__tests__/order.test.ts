import { describe, it, expect } from "vitest";
import { orderBetween } from "@/lib/notes/order";

describe("orderBetween", () => {
  it("midpoint between two neighbors", () => { expect(orderBetween(1, 3)).toBe(2); });
  it("before the first item", () => { expect(orderBetween(undefined, 5)).toBe(4); });
  it("after the last item", () => { expect(orderBetween(5, undefined)).toBe(6); });
  it("empty list", () => { expect(orderBetween(undefined, undefined)).toBe(0); });
});
