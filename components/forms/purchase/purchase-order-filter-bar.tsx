"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PurchaseOrderColumnVisibility } from "./column-visibility";
import { DynamicFilterBuilder } from "./dynamic-filter-builder";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FilterCondition } from "./types";
import type { ColumnConfig } from "./column-config";


interface PurchaseOrderFilterBarProps {
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
  poType?: string;
  onPoTypeChange?: (value: string) => void;
  children?: React.ReactNode;
}


export function PurchaseOrderFilterBar({
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
  poType,
  onPoTypeChange,
  children,
}: PurchaseOrderFilterBarProps) {

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
            placeholder="Search by Order No, Vendor..."
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

        {poType !== undefined && onPoTypeChange && (
          <Tabs
            value={poType}
            onValueChange={onPoTypeChange}
            className="h-9 items-center"
          >
            <TabsList className="h-9">
              <TabsTrigger value="Both" className="h-8 px-3">
                Both
              </TabsTrigger>
              <TabsTrigger value="Service" className="h-8 px-3">
                Service
              </TabsTrigger>
              <TabsTrigger value="Goods" className="h-8 px-3">
                Goods
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <PurchaseOrderColumnVisibility
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
