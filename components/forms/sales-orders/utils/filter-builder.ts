/**
 * OData Filter Builder for Sales Orders
 * Builds $filter string from search and column filters
 */

import type { ColumnConfig } from "../column-config";
import { ALL_COLUMNS } from "../column-config";

export interface SalesOrderFilterParams {
  /** Branch codes to filter by at API level (Shortcut_Dimension_2_Code). Required for listing only user's orders. */
  branchCodes?: string[];
  /** Status filter for tab (Open | Pending Approval | Released). Applied at API level. */
  statusFilter?: string;
  searchQuery?: string;
  columnFilters?: Record<string, { value: string; valueTo?: string }>;
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

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
  const orConditions = values.map((v) => {
    const escaped = escapeODataValue(v);
    return `contains(${columnId},'${escaped}')`;
  });
  return `(${orConditions.join(" or ")})`;
}

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
  const orConditions = values.map((v) => {
    const escaped = escapeODataValue(v);
    return `${columnId} eq '${escaped}'`;
  });
  return `(${orConditions.join(" or ")})`;
}

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

function buildNumberFilter(
  columnId: string,
  value: string,
  valueTo?: string,
): string[] {
  const parts: string[] = [];
  if (valueTo) {
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
    case "enum":
      return filter.value ? [buildEnumFilter(column.id, filter.value)] : [];
    case "date":
      return buildDateFilter(column.id, filter.value, filter.valueTo);
    case "number":
      return buildNumberFilter(column.id, filter.value, filter.valueTo);
    default:
      return [];
  }
}

/**
 * Build OData $filter for SalesOrder list
 * Branch filter is applied at API level so only orders for allowed branches are returned.
 */
export function buildSalesOrderFilterString(
  params: SalesOrderFilterParams,
): string | undefined {
  const { branchCodes = [], statusFilter, searchQuery, columnFilters = {} } =
    params;
  const filterParts: string[] = [];

  // API-level branch filter (Shortcut_Dimension_2_Code = branch codes)
  if (branchCodes.length > 0) {
    const branchFilter = branchCodes
      .map((c) => `'${escapeODataValue(c.trim())}'`)
      .filter(Boolean)
      .join(",");
    if (branchFilter) {
      filterParts.push(`Shortcut_Dimension_2_Code in (${branchFilter})`);
    }
  }

  // API-level status filter (tab: Open | Pending Approval | Released)
  if (statusFilter?.trim()) {
    filterParts.push(`Status eq '${escapeODataValue(statusFilter.trim())}'`);
  }

  if (searchQuery?.trim()) {
    const q = escapeODataValue(searchQuery.trim());
    filterParts.push(
      `(contains(No,'${q}') or contains(Sell_to_Customer_No,'${q}') or contains(Sell_to_Customer_Name,'${q}'))`,
    );
  }

  // Column filters (skip Shortcut_Dimension_2_Code and Status when applied at API level)
  Object.entries(columnFilters).forEach(([columnId, filter]) => {
    if (columnId === "Shortcut_Dimension_2_Code") return;
    if (columnId === "Status" && statusFilter) return;
    const column = ALL_COLUMNS.find((c) => c.id === columnId);
    if (!column) return;
    const parts = buildColumnFilter(column, filter);
    filterParts.push(...parts);
  });

  if (filterParts.length === 0) return undefined;
  return filterParts.join(" and ");
}
