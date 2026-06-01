import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { generateExcel, type ExcelColumn } from "@/lib/excel";

async function loadSheet(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb.worksheets[0];
}

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
    const columns: ExcelColumn[] = [{ header: "Name", key: "name" }];

    const buffer = await generateExcel("Empty", columns, []);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("writes a title row, subtitle, and header offset to row 3", async () => {
    const columns: ExcelColumn[] = [{ header: "Date", key: "date" }];
    const rows = [{ date: "2026-05-20" }];
    const sheet = await loadSheet(await generateExcel("Finances", columns, rows));

    expect(sheet.getCell("A1").value).toBe("Finances");
    expect(String(sheet.getCell("A2").value)).toContain("record");
    expect(sheet.getCell("A3").value).toBe("Date");
    // Data begins at row 4
    expect(String(sheet.getCell("A4").value)).toContain("2026");
  });

  it("freezes the header region and applies an autofilter", async () => {
    const columns: ExcelColumn[] = [
      { header: "Date", key: "date" },
      { header: "Amount", key: "amount" },
    ];
    const sheet = await loadSheet(
      await generateExcel("Finances", columns, [{ date: "2026-05-20", amount: 12.5 }])
    );

    expect(sheet.views[0]?.state).toBe("frozen");
    expect(sheet.autoFilter).toBeTruthy();
  });

  it("formats currency-like numeric columns", async () => {
    const columns: ExcelColumn[] = [{ header: "Amount", key: "amount" }];
    const sheet = await loadSheet(
      await generateExcel("Finances", columns, [{ amount: 1234.5 }])
    );

    // Header is row 3, first data row is row 4
    expect(sheet.getCell("A4").numFmt).toBe("#,##0.00");
  });
});
