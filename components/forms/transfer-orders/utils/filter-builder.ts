/**
 * OData Filter Builder for Sales Orders
 * Builds $filter string from search and column filters
 */

import type { ColumnConfig } from "../column-config";
import { ALL_COLUMNS } from "../column-config";

export interface TransferOrderFilterParams {
  /** LOB codes to filter by at API level (Shortcut_Dimension_1_Code). */
  lobCodes?: string[];
  /** Branch codes to filter by at API level (Shortcut_Dimension_2_Code). Required for listing only user's orders. */
  branchCodes?: string[];
  /** Status filter for tab (Open | Pending Approval | Released). Applied at API level. */
  statusFilter?: string;
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
 * Build OData $filter for TransferOrder list
 * Branch filter is applied at API level so only orders for allowed branches are returned.
 */
export function buildTransferOrderFilterString(
  params: TransferOrderFilterParams,
): string | undefined {
  const { lobCodes = [], branchCodes = [], statusFilter, columnFilters = {} } = params;
  const filterParts: string[] = [];

  // OData dimension access control
  // LOB Filter (Shortcut_Dimension_1_Code)
  if (lobCodes && lobCodes.length > 0) {
    const activeLobs = lobCodes.filter(Boolean);
    if (activeLobs.length === 1) {
      filterParts.push(`Shortcut_Dimension_1_Code eq '${escapeODataValue(activeLobs[0])}'`);
    } else if (activeLobs.length > 1) {
      const lobGroup = activeLobs
        .map((c) => `Shortcut_Dimension_1_Code eq '${escapeODataValue(c)}'`)
        .join(" or ");
      filterParts.push(`(${lobGroup})`);
    }
  } else {
    // If no authorized LOBs, return nothing
    filterParts.push("Shortcut_Dimension_1_Code eq 'N/A'");
  }

  // Branch Filter (Shortcut_Dimension_2_Code)
  if (branchCodes && branchCodes.length > 0) {
    const activeBranches = branchCodes.filter(Boolean);
    if (activeBranches.length === 1) {
      filterParts.push(`Shortcut_Dimension_2_Code eq '${escapeODataValue(activeBranches[0])}'`);
    } else if (activeBranches.length > 1) {
      const branchGroup = activeBranches
        .map((c) => `Shortcut_Dimension_2_Code eq '${escapeODataValue(c)}'`)
        .join(" or ");
      filterParts.push(`(${branchGroup})`);
    }
  } else {
    // If no authorized branches, return nothing
    filterParts.push("Shortcut_Dimension_2_Code eq 'N/A'");
  }

  // API-level status filter (tab: Open | Pending Approval | Released)
  if (statusFilter?.trim()) {
    filterParts.push(`Status eq '${escapeODataValue(statusFilter.trim())}'`);
  }


  // Column filters (skip dimensions and status applied at API level)
  Object.entries(columnFilters).forEach(([columnId, filter]) => {
    if (columnId === "Shortcut_Dimension_1_Code" || columnId === "Shortcut_Dimension_2_Code") return;
    if (columnId === "Status" && statusFilter) return;
    const column = ALL_COLUMNS.find((c) => c.id === columnId);
    if (!column) return;
    const parts = buildColumnFilter(column, filter);
    filterParts.push(...parts);
  });

  if (filterParts.length === 0) return undefined;
  return filterParts.join(" and ");
}
