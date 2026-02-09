/**
 * OData Filter Builder Utility
 * Constructs OData $filter strings for Production Orders queries
 */

import type { ColumnConfig } from "../column-config";
import { ALL_COLUMNS } from "../column-config";

export interface FilterParams {
  lobCodes: string[];
  searchQuery?: string;
  searchField?: "No" | "Search_Description";
  dueDateFrom?: string;
  dueDateTo?: string;
  columnFilters?: Record<string, { value: string; valueTo?: string }>;
}

/**
 * Escapes single quotes for OData filter values
 */
export function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Builds a text filter condition
 */
function buildTextFilter(columnId: string, value: string): string {
  const values = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (values.length === 0) return "";

  if (values.length === 1) {
    const escaped = escapeODataValue(values[0]);
    return `contains(${columnId},'${escaped}')`;
  }

  // Multiple values - OR condition
  const orConditions = values.map((v) => {
    const escaped = escapeODataValue(v);
    return `contains(${columnId},'${escaped}')`;
  });
  return `(${orConditions.join(" or ")})`;
}

/**
 * Builds an enum filter condition
 * Supports multiple comma-separated values using OR conditions
 * (more reliable than 'in' operator for some OData implementations)
 */
function buildEnumFilter(columnId: string, value: string): string {
  const values = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (values.length === 0) return "";

  if (values.length === 1) {
    const escaped = escapeODataValue(values[0]);
    return `${columnId} eq '${escaped}'`;
  }

  // Multiple values - use OR conditions (more reliable than 'in' operator)
  const orConditions = values.map((v) => {
    const escaped = escapeODataValue(v);
    return `${columnId} eq '${escaped}'`;
  });
  return `(${orConditions.join(" or ")})`;
}

/**
 * Builds a boolean filter condition
 */
function buildBooleanFilter(columnId: string, value: string): string {
  if (value === "true") return `${columnId} eq true`;
  if (value === "false") return `${columnId} eq false`;
  return "";
}

/**
 * Builds a date range filter condition
 */
function buildDateFilter(
  columnId: string,
  valueFrom?: string,
  valueTo?: string,
): string[] {
  const parts: string[] = [];
  if (valueFrom) parts.push(`${columnId} ge ${valueFrom}`);
  if (valueTo) parts.push(`${columnId} le ${valueTo}`);
  return parts;
}

/**
 * Builds a number filter condition
 * Supports operators: eq, gt, lt, range
 */
function buildNumberFilter(
  columnId: string,
  value: string,
  valueTo?: string,
): string[] {
  const parts: string[] = [];

  if (valueTo) {
    // Range filter
    if (value) parts.push(`${columnId} ge ${value}`);
    parts.push(`${columnId} le ${valueTo}`);
  } else if (value) {
    const [operator, numValue] = value.includes(":")
      ? value.split(":")
      : ["eq", value];

    switch (operator) {
      case "gt":
        parts.push(`${columnId} gt ${numValue}`);
        break;
      case "lt":
        parts.push(`${columnId} lt ${numValue}`);
        break;
      default:
        parts.push(`${columnId} eq ${numValue}`);
    }
  }

  return parts;
}

/**
 * Builds column filter based on column type
 */
function buildColumnFilter(
  column: ColumnConfig,
  filter: { value: string; valueTo?: string },
): string[] {
  if (!filter.value && !filter.valueTo) return [];

  switch (column.filterType) {
    case "text": {
      const result = buildTextFilter(column.id, filter.value);
      return result ? [result] : [];
    }
    case "enum": {
      if (!filter.value) return [];
      return [buildEnumFilter(column.id, filter.value)];
    }
    case "boolean": {
      const result = buildBooleanFilter(column.id, filter.value);
      return result ? [result] : [];
    }
    case "date":
      return buildDateFilter(column.id, filter.value, filter.valueTo);
    case "number":
      return buildNumberFilter(column.id, filter.value, filter.valueTo);
    default:
      return [];
  }
}

/**
 * Builds the complete OData $filter string
 */
export function buildFilterString(params: FilterParams): string {
  const {
    lobCodes,
    searchQuery,
    searchField,
    dueDateFrom,
    dueDateTo,
    columnFilters = {},
  } = params;

  const filterParts: string[] = [];

  // Base filter: LOB codes (required)
  if (lobCodes.length > 0) {
    const lobFilter = lobCodes.map((c) => `'${escapeODataValue(c)}'`).join(",");
    filterParts.push(`Shortcut_Dimension_1_Code in (${lobFilter})`);
  }

  // Search filter - only add if searchField is specified
  if (searchQuery?.trim() && searchField) {
    const searchTerm = escapeODataValue(searchQuery.trim());
    filterParts.push(`contains(${searchField},'${searchTerm}')`);
  }

  // Due Date range filter (from filter bar)
  if (dueDateFrom) {
    filterParts.push(`Due_Date ge ${dueDateFrom}`);
  }
  if (dueDateTo) {
    filterParts.push(`Due_Date le ${dueDateTo}`);
  }

  // Column filters
  Object.entries(columnFilters).forEach(([columnId, filter]) => {
    const column = ALL_COLUMNS.find((c) => c.id === columnId);
    if (!column) return;

    const columnFilterParts = buildColumnFilter(column, filter);
    filterParts.push(...columnFilterParts);
  });

  return filterParts.join(" and ");
}

/**
 * Builds the OData $orderby string
 */
export function buildOrderByString(
  sortColumn: string | null,
  sortDirection: "asc" | "desc" | null,
): string | undefined {
  if (!sortColumn || !sortDirection) return undefined;
  return `${sortColumn} ${sortDirection}`;
}
