import { describe, it, expect } from "vitest";
import { generateExcel, type ExcelColumn } from "@/lib/excel";

describe("generateExcel", () => {
  it("generates a buffer from columns and rows", async () => {
    const columns: ExcelColumn[] = [
      { header: "Date", key: "date" },
      { header: "Hours", key: "hours" },
      { header: "Note", key: "note" },
    ];
    const rows = [
      { date: "2026-05-20", hours: 8, note: "Productive day" },
      { date: "2026-05-21", hours: 6, note: "" },
    ];

    const buffer = await generateExcel("Work Sessions", columns, rows);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles empty rows", async () => {
    const columns: ExcelColumn[] = [
      { header: "Name", key: "name" },
    ];

    const buffer = await generateExcel("Empty", columns, []);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
