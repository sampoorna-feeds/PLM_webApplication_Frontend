"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SalesOrderColumnVisibility } from "./column-visibility";

interface SalesOrderFilterBarProps {
  searchQuery: string;
  visibleColumns: string[];
  onSearch: (query: string) => void;
  onClearFilters: () => void;
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
}

export function SalesOrderFilterBar({
  searchQuery,
  visibleColumns,
  onSearch,
  onClearFilters,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
}: SalesOrderFilterBarProps) {
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

  const hasActiveFilters = !!searchQuery;

  return (
    <div className="flex flex-wrap items-center gap-3 pb-3">
      <div className="relative max-w-sm min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by Order No, Customer..."
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

      <SalesOrderColumnVisibility
        visibleColumns={visibleColumns}
        onColumnToggle={onColumnToggle}
        onResetColumns={onResetColumns}
        onShowAllColumns={onShowAllColumns}
      />
    </div>
  );
}
