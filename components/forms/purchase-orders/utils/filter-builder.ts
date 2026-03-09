/**
 * OData Filter Builder for Purchase Orders
 * Builds $filter string from search and column filters
 */

import type { ColumnConfig } from "../column-config";
import { ALL_COLUMNS } from "../column-config";
import type { FilterCondition } from "../types";

export interface PurchaseOrderFilterParams {
  /** Branch codes to filter by at API level (Shortcut_Dimension_2_Code). Required for listing only user's orders. */
  branchCodes?: string[];
  /** Status filter for tab (Open | Pending Approval | Released). Applied at API level. */
  statusFilter?: string;
  columnFilters?: Record<string, { value: string; valueTo?: string }>;
  /** Additional dynamic filters from the DynamicFilterBuilder */
  additionalFilters?: FilterCondition[];
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
 * Build OData $filter for Purchase Order list
 * Branch filter is applied at API level so only orders for allowed branches are returned.
 */
export function buildPurchaseOrderFilterString(
  params: PurchaseOrderFilterParams,
): string | undefined {
  const {
    branchCodes = [],
    statusFilter,
    columnFilters = {},
    additionalFilters = [],
  } = params;
  const filterParts: string[] = [];

  // API-level branch filter (Shortcut_Dimension_2_Code = branch codes)
  if (branchCodes.length > 0) {
    const branchFilter = branchCodes
      .map(
        (c: string) =>
          `Shortcut_Dimension_2_Code eq '${escapeODataValue(c.trim())}'`,
      )
      .join(" or ");
    if (branchFilter) {
      filterParts.push(`(${branchFilter})`);
    }
  }

  // API-level status filter (tab: Open | Pending Approval | Released)
  if (statusFilter?.trim()) {
    filterParts.push(`Status eq '${escapeODataValue(statusFilter.trim())}'`);
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

  // Additional dynamic filters from DynamicFilterBuilder
  additionalFilters.forEach((f) => {
    const escaped = escapeODataValue(f.value);
    switch (f.operator) {
      case "contains":
        filterParts.push(`contains(${f.field},'${escaped}')`);
        break;
      case "startswith":
        filterParts.push(`startswith(${f.field},'${escaped}')`);
        break;
      case "endswith":
        filterParts.push(`endswith(${f.field},'${escaped}')`);
        break;
      case "eq":
      case "ne":
      case "gt":
      case "ge":
      case "lt":
      case "le":
        if (f.type === "number") {
          filterParts.push(`${f.field} ${f.operator} ${f.value}`);
        } else if (f.type === "date") {
          filterParts.push(`${f.field} ${f.operator} ${f.value}`);
        } else {
          filterParts.push(`${f.field} ${f.operator} '${escaped}'`);
        }
        break;
    }
  });

  if (filterParts.length === 0) return undefined;
  return filterParts.join(" and ");
}
