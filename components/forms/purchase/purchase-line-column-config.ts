import { ColumnConfig } from "./column-config";
import { PurchaseLineDocumentType, getPurchaseLineQuantityConfig } from "./purchase-line-quantity-config";

export function getPurchaseLineColumnConfig(documentType: PurchaseLineDocumentType) {
  const qtyConfig = getPurchaseLineQuantityConfig(documentType);

  const defaultColumns: ColumnConfig[] = [
    { id: "lineNo", label: "Line", sortable: false, defaultVisible: true },
    { id: "type", label: "Type", sortable: false, defaultVisible: true },
    { id: "no", label: "No", sortable: false, defaultVisible: true },
    { id: "description", label: "Description", sortable: false, defaultVisible: true },
    { id: "quantity", label: "Quantity", sortable: false, defaultVisible: true },
    { id: "unitPrice", label: "Unit Price", sortable: false, defaultVisible: true },
    { id: "amount", label: "Amount", sortable: false, defaultVisible: true },
  ];

  const showBagsColumn = documentType !== "invoice";
  const showQtyColumns = documentType === "order" || documentType === "return-order";
  const showExtendedQtyColumns = documentType === "order";

  const optionalColumns: ColumnConfig[] = [
    { id: "uom", label: "UOM", sortable: false, defaultVisible: false },
  ];

  if (showBagsColumn) {
    optionalColumns.push({ id: "noOfBags", label: "Bags", sortable: false, defaultVisible: false });
  }

  optionalColumns.push({ id: "tax", label: "Tax", sortable: false, defaultVisible: false });

  if (showExtendedQtyColumns) {
    optionalColumns.push(
      { id: "outstandingQty", label: "Outstanding Qty", sortable: false, defaultVisible: false },
      { id: "challanQty", label: "Challan Qty", sortable: false, defaultVisible: false },
      { id: "weightQty", label: "Weight Qty", sortable: false, defaultVisible: false },
      { id: "actualQty", label: "Actual Qty", sortable: false, defaultVisible: false },
      { id: "shortExcess", label: "Short/Excess", sortable: false, defaultVisible: false }
    );
  }

  if (showQtyColumns) {
    optionalColumns.push(
      { id: "firstPending", label: qtyConfig.firstPendingLabel, sortable: false, defaultVisible: false },
      { id: "firstCompleted", label: qtyConfig.firstCompletedLabel, sortable: false, defaultVisible: false },
      { id: "secondPending", label: qtyConfig.secondPendingLabel, sortable: false, defaultVisible: false },
      { id: "secondCompleted", label: qtyConfig.secondCompletedLabel, sortable: false, defaultVisible: false }
    );
  }

  optionalColumns.push(
    { id: "discount", label: "Disc %", sortable: false, defaultVisible: false },
    { id: "gstGroupCode", label: "GST Group", sortable: false, defaultVisible: false },
    { id: "hsnSacCode", label: "HSN/SAC", sortable: false, defaultVisible: false },
    { id: "gstCredit", label: "GST Credit", sortable: false, defaultVisible: false },
    { id: "exempted", label: "Exempt", sortable: false, defaultVisible: false }
  );

  const storageKey = `purchaseLineVisibleColumns_${documentType}`;

  function getDefaultVisibleColumns(): string[] {
    return defaultColumns.map((col) => col.id);
  }

  function loadVisibleColumns(): string[] {
    if (typeof window === "undefined") return getDefaultVisibleColumns();
    // Try cookie first as requested
    const match = document.cookie.match(new RegExp('(^| )' + storageKey + '=([^;]+)'));
    if (match) {
      try {
        const parsed = JSON.parse(decodeURIComponent(match[2]));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // ignore
      }
    }
    return getDefaultVisibleColumns();
  }

  function saveVisibleColumns(columns: string[]): void {
    if (typeof window === "undefined") return;
    const expires = new Date();
    expires.setTime(expires.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year
    document.cookie = `${storageKey}=${encodeURIComponent(JSON.stringify(columns))};expires=${expires.toUTCString()};path=/`;
  }

  return {
    defaultColumns,
    optionalColumns,
    allColumns: [...defaultColumns, ...optionalColumns],
    loadVisibleColumns,
    saveVisibleColumns,
    getDefaultVisibleColumns
  };
}
