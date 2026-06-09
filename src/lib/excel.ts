import ExcelJS from "exceljs";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelSummaryRow {
  label: string;
  value: number | string;
  currency?: boolean;
}

export interface ExcelSection {
  title: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
}

export interface ExcelOptions {
  /** Bold label/value lines rendered a couple rows below the main table. */
  summaryRows?: ExcelSummaryRow[];
  /** Titled sub-tables stacked below the summary. */
  sections?: ExcelSection[];
}

// Brand palette (matches the app's dark indigo accent)
const COLORS = {
  title: "FF1E1B4B", // deep indigo for the title text
  headerFill: "FF4F46E5", // indigo-600 header background
  headerText: "FFFFFFFF",
  stripeFill: "FFF1F1FA", // very light lavender for zebra rows
  border: "FFE2E2EE",
  subtitle: "FF6B7280", // muted grey
};

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = {
    style: "thin",
    color: { argb: COLORS.border },
  };
  return { top: side, left: side, bottom: side, right: side };
}

/**
 * Detects the best display type for a column from its values so we can
 * right-align numbers, format currency-ish amounts, and keep text left-aligned.
 */
function detectColumnType(
  key: string,
  rows: Record<string, unknown>[]
): "number" | "currency" | "text" {
  const values = rows
    .map((r) => r[key])
    .filter((v) => v !== "" && v !== null && v !== undefined);
  if (values.length === 0) return "text";

  const allNumeric = values.every((v) => typeof v === "number");
  if (!allNumeric) return "text";

  const lowered = key.toLowerCase();
  if (/(amount|cost|price|income|total|spent|paid|salary)/.test(lowered)) {
    return "currency";
  }
  return "number";
}

export async function generateExcel(
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, unknown>[],
  options?: ExcelOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Lifora";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 3 }], // freeze title + subtitle + header
  });

  const colCount = Math.max(columns.length, 1);
  const lastCol = sheet.getColumn(colCount).letter;
  const columnTypes = columns.map((c) => detectColumnType(c.key, rows));

  // --- Row 1: Title ---
  sheet.mergeCells(`A1:${lastCol}1`);
  const titleCell = sheet.getCell("A1");
  titleCell.value = sheetName;
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.title } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 28;

  // --- Row 2: Subtitle (export metadata) ---
  sheet.mergeCells(`A2:${lastCol}2`);
  const subtitleCell = sheet.getCell("A2");
  const exportedOn = new Date().toLocaleDateString("en-CA");
  const recordWord = rows.length === 1 ? "record" : "records";
  subtitleCell.value = `Exported ${exportedOn} · ${rows.length} ${recordWord}`;
  subtitleCell.font = { size: 10, italic: true, color: { argb: COLORS.subtitle } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(2).height = 18;

  // --- Row 3: Header ---
  const headerRow = sheet.getRow(3);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.headerFill },
    };
    cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = thinBorder();
  });
  headerRow.height = 22;

  // --- Data rows ---
  rows.forEach((row, rIdx) => {
    const excelRow = sheet.getRow(rIdx + 4);
    columns.forEach((col, cIdx) => {
      const cell = excelRow.getCell(cIdx + 1);
      cell.value = (row[col.key] ?? "") as ExcelJS.CellValue;
      cell.border = thinBorder();
      cell.alignment = {
        vertical: "middle",
        horizontal: columnTypes[cIdx] === "text" ? "left" : "right",
        wrapText: false,
      };
      if (columnTypes[cIdx] === "currency") {
        cell.numFmt = "#,##0.00";
      } else if (columnTypes[cIdx] === "number") {
        cell.numFmt = "#,##0.##";
      }
      // Zebra striping on even data rows
      if (rIdx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.stripeFill },
        };
      }
    });
  });

  // --- Column widths: auto-fit to content, clamped ---
  columns.forEach((col, i) => {
    if (col.width) {
      sheet.getColumn(i + 1).width = col.width;
      return;
    }
    let maxLen = col.header.length;
    for (const row of rows) {
      const v = row[col.key];
      const len = v == null ? 0 : String(v).length;
      if (len > maxLen) maxLen = len;
    }
    sheet.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 12), 50);
  });

  // --- Autofilter on the header row (only when there's data) ---
  if (columns.length > 0) {
    sheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: colCount },
    };
  }

  // --- Optional summary rows + extra sections (stacked below the main table) ---
  let cursor = 3 + rows.length; // last row used by the main table (header at row 3)

  if (options?.summaryRows?.length) {
    cursor += 2; // gap below the table
    for (const sr of options.summaryRows) {
      const r = sheet.getRow(cursor);
      const labelCell = r.getCell(1);
      labelCell.value = sr.label;
      labelCell.font = { bold: true, color: { argb: COLORS.title } };
      labelCell.alignment = { vertical: "middle", horizontal: "left" };
      const valueCell = r.getCell(2);
      valueCell.value = sr.value as ExcelJS.CellValue;
      valueCell.font = { bold: true };
      valueCell.alignment = { vertical: "middle", horizontal: "right" };
      if (sr.currency && typeof sr.value === "number") {
        valueCell.numFmt = "#,##0.00";
      }
      cursor += 1;
    }
  }

  if (options?.sections?.length) {
    for (const section of options.sections) {
      cursor += 2; // gap before each section

      // Section title (merged across the section's columns)
      const sCols = Math.max(section.columns.length, 1);
      const sLastCol = sheet.getColumn(sCols).letter;
      sheet.mergeCells(`A${cursor}:${sLastCol}${cursor}`);
      const sTitle = sheet.getCell(`A${cursor}`);
      sTitle.value = section.title;
      sTitle.font = { bold: true, size: 13, color: { argb: COLORS.title } };
      sTitle.alignment = { vertical: "middle", horizontal: "left" };
      sheet.getRow(cursor).height = 22;
      cursor += 1;

      // Section header
      const sHeader = sheet.getRow(cursor);
      section.columns.forEach((col, i) => {
        const cell = sHeader.getCell(i + 1);
        cell.value = col.header;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.headerFill },
        };
        cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11 };
        cell.alignment = { vertical: "middle", horizontal: "left" };
        cell.border = thinBorder();
      });
      sHeader.height = 20;
      cursor += 1;

      // Section data rows
      const sTypes = section.columns.map((c) => detectColumnType(c.key, section.rows));
      section.rows.forEach((row, rIdx) => {
        const excelRow = sheet.getRow(cursor + rIdx);
        section.columns.forEach((col, cIdx) => {
          const cell = excelRow.getCell(cIdx + 1);
          cell.value = (row[col.key] ?? "") as ExcelJS.CellValue;
          cell.border = thinBorder();
          cell.alignment = {
            vertical: "middle",
            horizontal: sTypes[cIdx] === "text" ? "left" : "right",
          };
          if (sTypes[cIdx] === "currency") cell.numFmt = "#,##0.00";
          else if (sTypes[cIdx] === "number") cell.numFmt = "#,##0.##";
          if (rIdx % 2 === 1) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: COLORS.stripeFill },
            };
          }
        });
      });
      cursor += section.rows.length;

      // Widen columns to fit section content where it exceeds the main table
      section.columns.forEach((col, i) => {
        const existing = sheet.getColumn(i + 1).width ?? 0;
        let maxLen = col.header.length;
        for (const row of section.rows) {
          const v = row[col.key];
          const len = v == null ? 0 : String(v).length;
          if (len > maxLen) maxLen = len;
        }
        const want = Math.min(Math.max(maxLen + 2, 12), 50);
        if (want > existing) sheet.getColumn(i + 1).width = want;
      });
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
