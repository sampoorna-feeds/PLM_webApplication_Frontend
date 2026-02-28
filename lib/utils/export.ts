import * as XLSX from "xlsx";
import type { ItemLedgerEntry } from "@/lib/api/services/report-ledger.service";
import {
  ALL_COLUMNS,
  type ColumnConfig,
} from "@/components/forms/report-ledger/column-config";

/**
 * Exports an array of ItemLedgerEntries to an Excel (.xlsx) file.
 *
 * @param entries The data to export
 * @param exportColumnIds The IDs of the columns to include in the export
 * @param appliedFilters Array of string descriptions of the active filters
 * @param filename The desired filename (without extension)
 */
export function exportToExcel(
  entries: ItemLedgerEntry[],
  exportColumnIds: string[],
  appliedFilters: string[],
  filename: string = "Report_Ledger_Export",
) {
  // 1. Map column IDs to their corresponding config objects for headers
  const exportColumns: ColumnConfig[] = exportColumnIds
    .map((id) => ALL_COLUMNS.find((col) => col.id === id))
    .filter((col): col is ColumnConfig => col !== undefined);

  // 2. Transform the raw data into an array of objects matching the selected columns
  const exportData = entries.map((entry) => {
    const row: Record<string, any> = {};
    exportColumns.forEach((col) => {
      // Map the user-friendly label to the raw data value
      row[col.label] = entry[col.id];
    });
    return row;
  });

  // 3. Create a worksheet and add metadata strings at the top
  const metadataRows = [
    ["Applied Filters:"],
    ...appliedFilters.map((filter) => [`  • ${filter}`]),
    [], // empty row for spacing
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(metadataRows);

  // 4. Append the actual data below the metadata
  XLSX.utils.sheet_add_json(worksheet, exportData, {
    origin: metadataRows.length,
    skipHeader: false,
  });

  // 5. Auto-size columns conceptually (basic implementation for readability)
  const colWidths = exportColumns.map((col) => {
    return { wch: Math.max(col.label.length, 12) + 2 };
  });

  // Make the first column slightly wider to accommodate the metadata titles
  if (colWidths.length > 0) {
    colWidths[0].wch = Math.max(colWidths[0].wch, 40);
  }
  worksheet["!cols"] = colWidths;

  // 6. Enable Excel AutoFilter for the data range (starting at the data header row)
  const headerRowIndex = metadataRows.length;
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
  // Set the autofilter range to exactly the data table area
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: headerRowIndex },
      e: { c: exportColumns.length - 1, r: range.e.r },
    }),
  };

  // 7. Create a new workbook and append the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger Entries");

  // 8. Generate the Excel file with full timestamp and trigger the download
  // Format: DD-MM-YYYY-HH-MM-SS
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${d}-${m}-${y}-${h}-${min}-${s}`;

  XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
}
