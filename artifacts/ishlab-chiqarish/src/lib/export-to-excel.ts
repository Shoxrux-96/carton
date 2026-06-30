import * as XLSX from "xlsx";

export interface ExcelColumn<T = any> {
  header: string;
  key: string;
  accessor?: (item: T) => string | number;
}

export function exportToExcel<T>(
  data: T[],
  columns: ExcelColumn<T>[],
  filename: string
) {
  const rows = data.map((item) => {
    const row: Record<string, string | number> = {};
    for (const col of columns) {
      row[col.header] = col.accessor
        ? col.accessor(item)
        : (item as any)[col.key] ?? "";
    }
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = columns.map((col) => ({
    wch: Math.max(col.header.length, 12),
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
