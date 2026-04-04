import * as XLSX from "xlsx";

/**
 * Exports an array of entries to an Excel (.xlsx) file.
 *
 * @param entries The data to export
 * @param exportColumnIds The IDs of the columns to include in the export (order and selection)
 * @param appliedFilters Array of string descriptions of the active filters
 * @param filename The desired filename (without extension)
 * @param allColumns The full column configuration (ID and Label) for mapping
 * @param balances Optional financial balances to include as rows
 */
export function exportToExcel(
  entries: any[],
  exportColumnIds: string[],
  appliedFilters: string[],
  filename: string = "Ledger_Export",
  allColumns: { id: string; label: string }[],
  balances?: {
    opening?: number;
    closing?: number;
  }
) {
  // 1. Map column IDs to their corresponding config objects for headers
  const exportColumns = exportColumnIds
    .map((id) => allColumns.find((col) => col.id === id))
    .filter((col): col is { id: string; label: string } => col !== undefined);

  // 2. Transform the raw data into an array of objects matching the selected columns
  const exportData: Record<string, any>[] = [];

  // Helper to create a balance row
  const createBalanceRow = (label: string, balance: number) => {
    const row: Record<string, any> = {};
    let labelAssigned = false;

    exportColumns.forEach((col) => {
      if (col.id === "Amount" || col.id === "Amount_LCY") {
        row[col.label] = balance;
      } else if (!labelAssigned && (col.id === "Description" || col.id === "VendorName" || col.id === "Posting_Date")) {
        row[col.label] = label;
        labelAssigned = true;
      } else {
        row[col.label] = "";
      }
    });

    // Fallback if none of the preferred columns are visible
    if (!labelAssigned && exportColumns.length > 0) {
      // Find the first column that isn't Amount to put the label
      const fallbackCol = exportColumns.find(c => c.id !== "Amount" && c.id !== "Amount_LCY") || exportColumns[0];
      row[fallbackCol.label] = label;
    }

    return row;
  };

  // Add Opening Balance Row
  if (balances?.opening !== undefined) {
    exportData.push(createBalanceRow("Opening Balance", balances.opening));
  }

  // Add Entries
  entries.forEach((entry) => {
    const row: Record<string, any> = {};
    exportColumns.forEach((col) => {
      row[col.label] = entry[col.id];
    });
    exportData.push(row);
  });

  // Add Closing Balance Row
  if (balances?.closing !== undefined) {
    exportData.push(createBalanceRow("Closing Balance", balances.closing));
  }

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
