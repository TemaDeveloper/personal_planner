import ExcelJS from "exceljs";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
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
  rows: Record<string, unknown>[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Personal Planner";
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

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
