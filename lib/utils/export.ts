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

/**
 * Exports an array of SummaryRow entries to an Excel (.xlsx) file.
 */
export function exportSummaryToExcel(
  entries: any[], // using any[] locally inside to avoid circular deps if needed, casting from SummaryRow
  appliedFilters: string[],
  dateFrom: string,
  dateTo: string,
  filename: string = "Inventory_Summary_Export",
) {
  // Define the ordered columns for the Summary export.
  const summaryColumns = [
    { label: "Item No.", key: "itemNo" },
    { label: "Description", key: "description" },
    { label: "Base UoM", key: "baseUoM" },
    { label: "Inventory Posting Group", key: "inventoryPostingGroup" },
    { label: `Opening Qty (${dateFrom || "Start"})`, key: "openingQty" },
    { label: `Opening Value (${dateFrom || "Start"})`, key: "openingValue" },
    { label: "Increases Qty (LCY)", key: "increasesQty" },
    { label: "Increases Value (LCY)", key: "increasesValue" },
    { label: "Decreases Qty (LCY)", key: "decreasesQty" },
    { label: "Decreases Value (LCY)", key: "decreasesValue" },
    { label: `Closing Qty (${dateTo || "End"})`, key: "closingQty" },
    { label: `Closing Value (${dateTo || "End"})`, key: "closingValue" },
  ];

  // Map raw data into the column layout
  const exportData = entries.map((entry) => {
    const row: Record<string, any> = {};
    summaryColumns.forEach((col) => {
      row[col.label] = entry[col.key];
    });
    return row;
  });

  // Create metadata
  const metadataRows = [
    ["Applied Filters:"],
    ...appliedFilters.map((filter) => [`  • ${filter}`]),
    [], // empty row for spacing
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(metadataRows);

  XLSX.utils.sheet_add_json(worksheet, exportData, {
    origin: metadataRows.length,
    skipHeader: false,
  });

  const colWidths = summaryColumns.map((col) => ({
    wch: Math.max(col.label.length, 12) + 2,
  }));
  if (colWidths.length > 0) colWidths[0].wch = Math.max(colWidths[0].wch, 40);
  worksheet["!cols"] = colWidths;

  const headerRowIndex = metadataRows.length;
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: headerRowIndex },
      e: { c: summaryColumns.length - 1, r: range.e.r },
    }),
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Summary");

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
