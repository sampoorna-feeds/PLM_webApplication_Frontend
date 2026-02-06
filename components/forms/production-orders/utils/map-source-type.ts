/**
 * Source Type Mapping Utility
 * Converts API source type values to form-compatible values
 */

import type { SourceType } from "../types";

/**
 * Maps API source type to form source type
 * API might return different formats: "Item", "0", "Family", "1", "Sales Header", "2", etc.
 */
export function mapSourceType(apiType?: string): SourceType {
  if (!apiType) return "";

  const normalized = apiType.toLowerCase().trim();

  // Handle both string and numeric representations
  if (normalized === "item" || normalized === "0") return "Item";
  if (normalized === "family" || normalized === "1") return "Family";
  if (
    normalized === "sales header" ||
    normalized === "salesheader" ||
    normalized === "sales_header" ||
    normalized === "2"
  ) {
    return "Sales Header";
  }

  return "";
}

/**
 * Maps form source type to API source type
 */
export function mapSourceTypeToApi(formType: SourceType): string {
  switch (formType) {
    case "Item":
      return "Item";
    case "Family":
      return "Family";
    case "Sales Header":
      return "Sales Header";
    default:
      return "";
  }
}
