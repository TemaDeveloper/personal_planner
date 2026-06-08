import { describe, it, expect } from "vitest";
import { layoutDayEvents } from "../event-layout";

const day = new Date(2026, 5, 1, 0, 0, 0, 0); // 2026-06-01 00:00 local
const at = (h: number, m = 0) => new Date(2026, 5, 1, h, m, 0, 0);

describe("layoutDayEvents", () => {
  const opts = { dayStart: day, hourHeight: 48, minHeight: 12 };

  it("gives a single event full width", () => {
    const [p] = layoutDayEvents([{ id: "a", start: at(9), end: at(10) }], opts);
    expect(p.left).toBe(0);
    expect(p.width).toBe(1);
    expect(p.top).toBe(9 * 48);
    expect(p.height).toBe(48);
  });

  it("splits two overlapping events into two columns", () => {
    const res = layoutDayEvents(
      [
        { id: "a", start: at(9), end: at(10, 30) },
        { id: "b", start: at(10), end: at(11) },
      ],
      opts
    );
    const a = res.find((p) => p.id === "a")!;
    const b = res.find((p) => p.id === "b")!;
    expect(a.width).toBeCloseTo(0.5);
    expect(b.width).toBeCloseTo(0.5);
    expect(new Set([a.left, b.left])).toEqual(new Set([0, 0.5]));
  });

  it("does NOT overlap back-to-back events (end == next start)", () => {
    const res = layoutDayEvents(
      [
        { id: "a", start: at(9), end: at(10) },
        { id: "b", start: at(10), end: at(11) },
      ],
      opts
    );
    expect(res.find((p) => p.id === "a")!.width).toBe(1);
    expect(res.find((p) => p.id === "b")!.width).toBe(1);
  });

  it("splits a three-way overlap into thirds", () => {
    const res = layoutDayEvents(
      [
        { id: "a", start: at(9), end: at(12) },
        { id: "b", start: at(9, 30), end: at(11) },
        { id: "c", start: at(10), end: at(11) },
      ],
      opts
    );
    for (const p of res) expect(p.width).toBeCloseTo(1 / 3);
    expect(new Set(res.map((p) => p.left))).toEqual(new Set([0, 1 / 3, 2 / 3]));
  });

  it("enforces a minimum height for very short events", () => {
    const [p] = layoutDayEvents([{ id: "a", start: at(9), end: at(9, 5) }], opts);
    expect(p.height).toBe(12);
  });

  it("positions a full-day event from top to bottom", () => {
    const [p] = layoutDayEvents(
      [{ id: "a", start: at(0), end: new Date(2026, 5, 2, 0, 0, 0, 0) }],
      opts
    );
    expect(p.top).toBe(0);
    expect(p.height).toBe(24 * 48);
  });
});
