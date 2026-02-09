"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ColumnVisibility } from "./column-visibility";

interface TableFilterBarProps {
  // Basic filters
  searchQuery: string;
  // Column visibility
  visibleColumns: string[];
  // Column filters (for badge count)
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  // Handlers
  onSearch: (query: string) => void;
  onClearFilters: () => void;
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
}

export function TableFilterBar({
  searchQuery,
  visibleColumns,
  columnFilters,
  onSearch,
  onClearFilters,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
}: TableFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync local search with external state
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearch(localSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearch]);

  // Count active column filters
  const activeFilterCount = Object.entries(columnFilters).filter(
    ([key, filter]) => {
      // Skip checking for Status=Released vs default
      return filter.value || filter.valueTo;
    },
  ).length;

  const hasActiveFilters = searchQuery || activeFilterCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 pb-3">
      {/* Search Input */}
      <div className="relative max-w-sm min-w-50 flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by No, Description..."
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

      <div className="flex-1" />

      {/* Clear Filters */}
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

      {/* Column Visibility */}
      <ColumnVisibility
        visibleColumns={visibleColumns}
        onColumnToggle={onColumnToggle}
        onResetColumns={onResetColumns}
        onShowAllColumns={onShowAllColumns}
      />
    </div>
  );
}
