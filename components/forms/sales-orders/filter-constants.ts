// Filter option constants for Sales Orders table
// Based on Business Central / sample API response

export const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Open", label: "Open" },
  { value: "Released", label: "Released" },
] as const;

export const INVOICE_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "Taxable", label: "Taxable" },
  { value: "Bill of Supply", label: "Bill of Supply" },
  { value: "Export", label: "Export" },
  { value: "Supplementary", label: "Supplementary" },
  { value: "Non-GST", label: "Non-GST" },
] as const;
