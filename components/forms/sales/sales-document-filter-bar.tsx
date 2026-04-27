"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SalesDocumentColumnVisibility } from "./sales-document-column-visibility";
import { DynamicFilterBuilder } from "./dynamic-filter-builder";
import type { ColumnConfig } from "./column-config";
import type { FilterCondition } from "./types";

interface SalesDocumentFilterBarProps {
  searchQuery: string;
  visibleColumns: string[];
  allColumns: ColumnConfig[];
  defaultColumns: ColumnConfig[];
  optionalColumns: ColumnConfig[];
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  additionalFilters: FilterCondition[];
  onSearch: (query: string) => void;
  onClearFilters: () => void;
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
  onAddAdditionalFilter: (filter: FilterCondition) => void;
  onRemoveAdditionalFilter: (index: number) => void;
  children?: React.ReactNode;
}

export function SalesDocumentFilterBar({
  searchQuery,
  visibleColumns,
  allColumns,
  defaultColumns,
  optionalColumns,
  columnFilters,
  additionalFilters,
  onSearch,
  onClearFilters,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
  onAddAdditionalFilter,
  onRemoveAdditionalFilter,
  children,
}: SalesDocumentFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearch(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearch]);

  const activeFilterCount = Object.entries(columnFilters).filter(
    ([id, filter]) =>
      id !== "Shortcut_Dimension_2_Code" && (filter.value || filter.valueTo),
  ).length;
  const hasActiveFilters =
    !!searchQuery || activeFilterCount > 0 || additionalFilters.length > 0;

  return (
    <div className="space-y-2 pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-50 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by No, Customer, Ship-to Name..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pr-10 pl-10"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch("");
                onSearch("");
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <DynamicFilterBuilder
          filters={additionalFilters}
          allColumns={allColumns}
          onAddFilter={onAddAdditionalFilter}
          onRemoveFilter={onRemoveAdditionalFilter}
        />

        <div className="flex-1" />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Reset Filters
          </Button>
        )}

        <SalesDocumentColumnVisibility
          visibleColumns={visibleColumns}
          defaultColumns={defaultColumns}
          optionalColumns={optionalColumns}
          onColumnToggle={onColumnToggle}
          onResetColumns={onResetColumns}
          onShowAllColumns={onShowAllColumns}
        />

        {children}
      </div>
    </div>
  );
}
