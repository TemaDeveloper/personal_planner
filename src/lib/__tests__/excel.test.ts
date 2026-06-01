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

  it("renders summary rows below the main table", async () => {
    const columns: ExcelColumn[] = [
      { header: "Date", key: "date" },
      { header: "Total", key: "total" },
    ];
    const rows = [{ date: "2026-05-20", total: 200 }];
    const sheet = await loadSheet(
      await generateExcel("Work Sessions", columns, rows, {
        summaryRows: [
          { label: "Gross earnings", value: 200, currency: true },
          { label: "Net", value: 180, currency: true },
        ],
      })
    );

    // Main table: header row 3, single data row 4. Summary starts two rows below (row 6).
    expect(sheet.getCell("A6").value).toBe("Gross earnings");
    expect(sheet.getCell("B6").value).toBe(200);
    expect(sheet.getCell("B6").numFmt).toBe("#,##0.00");
    expect(sheet.getCell("A7").value).toBe("Net");
    expect(sheet.getCell("B7").value).toBe(180);
  });

  it("renders an extra titled section below the summary", async () => {
    const columns: ExcelColumn[] = [{ header: "Date", key: "date" }];
    const rows = [{ date: "2026-05-20" }];
    const sheet = await loadSheet(
      await generateExcel("Work Sessions", columns, rows, {
        sections: [
          {
            title: "Gas & Routes",
            columns: [
              { header: "Origin", key: "origin" },
              { header: "Destination", key: "destination" },
            ],
            rows: [{ origin: "Home", destination: "Site A" }],
          },
        ],
      })
    );

    // Main table ends at row 4; section title two rows below (row 6),
    // section header row 7, section data row 8.
    expect(sheet.getCell("A6").value).toBe("Gas & Routes");
    expect(sheet.getCell("A7").value).toBe("Origin");
    expect(sheet.getCell("B7").value).toBe("Destination");
    expect(sheet.getCell("A8").value).toBe("Home");
    expect(sheet.getCell("B8").value).toBe("Site A");
  });

  it("leaves the sheet clean when no options are provided", async () => {
    const columns: ExcelColumn[] = [{ header: "Date", key: "date" }];
    const sheet = await loadSheet(
      await generateExcel("Plain", columns, [{ date: "2026-05-20" }])
    );
    expect(sheet.getCell("A6").value).toBeNull();
  });
});
