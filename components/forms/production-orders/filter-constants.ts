// Filter option constants for Production Orders table
// Based on Business Central field definitions and sample data

// Status options from BC (enum field)
export const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Finished", label: "Finished" },
  { value: "Firm Planned", label: "Firm Planned" },
  { value: "Planned", label: "Planned" },
  { value: "Released", label: "Released" },
  { value: "Simulated", label: "Simulated" },
] as const;

// Source Type options from BC (enum field)
export const SOURCE_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "Item", label: "Item" },
  { value: "Family", label: "Family" },
] as const;

// Blocked status options (boolean field)
export const BLOCKED_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Blocked" },
  { value: "false", label: "Not Blocked" },
] as const;

// Note: Batch_Size is a text/decimal field (e.g., "2.0", "1.0"), not an enum
// Use text input for Batch Size filter instead of dropdown
