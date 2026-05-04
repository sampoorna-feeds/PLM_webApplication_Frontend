/**
 * OData Filter Builder for Gate Entry
 * Builds $filter string from search and column filters
 */

import { type ColumnConfig } from "../column-config";

export interface GateEntryFilterParams {
  columnFilters?: Record<string, { value: string; valueTo?: string }>;
  allColumns: ColumnConfig[];
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
      case "ge":
        parts.push(`${columnId} ge ${numValue}`);
        break;
      case "le":
        parts.push(`${columnId} le ${numValue}`);
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
    case "text":
    case "select": {
      const result = buildTextFilter(column.id, filter.value);
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

export function buildGateEntryFilterString(
  params: GateEntryFilterParams,
): string | undefined {
  const { columnFilters = {}, allColumns } = params;

  const filterParts: string[] = [];

  Object.entries(columnFilters).forEach(([columnId, filter]) => {
    const column = allColumns.find((c) => c.id === columnId);
    if (!column) return;
    const parts = buildColumnFilter(column, filter);
    filterParts.push(...parts);
  });

  if (filterParts.length === 0) return undefined;
  return filterParts.join(" and ");
}
