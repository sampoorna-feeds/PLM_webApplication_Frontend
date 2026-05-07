// Filter option constants for PurchaseOrders table
// Based on Business Central / sample API response

export const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Open", label: "Open" },
  { value: "Released", label: "Released" },
] as const;

export const INVOICE_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "Self Invoice", label: "Self Invoice" },
  { value: "Debit Note", label: "Debit Note" },
  { value: "Supplementary", label: "Supplementary" },
  { value: "Non-GST", label: "Non-GST" },
] as const;
