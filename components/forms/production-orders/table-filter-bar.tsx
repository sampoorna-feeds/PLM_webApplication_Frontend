"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColumnVisibility } from "./column-visibility";

interface TableFilterBarProps {
  searchQuery: string;
  dueDateFrom: string;
  dueDateTo: string;
  visibleColumns: string[];
  onSearch: (query: string) => void;
  onDateFilter: (from: string, to: string) => void;
  onClearFilters: () => void;
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
}

export function TableFilterBar({
  searchQuery,
  dueDateFrom,
  dueDateTo,
  visibleColumns,
  onSearch,
  onDateFilter,
  onClearFilters,
  onColumnToggle,
  onResetColumns,
}: TableFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localDateFrom, setLocalDateFrom] = useState(dueDateFrom);
  const [localDateTo, setLocalDateTo] = useState(dueDateTo);

  // Sync local state with props
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setLocalDateFrom(dueDateFrom);
    setLocalDateTo(dueDateTo);
  }, [dueDateFrom, dueDateTo]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearch(localSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearch]);

  const handleDateChange = useCallback(() => {
    if (localDateFrom !== dueDateFrom || localDateTo !== dueDateTo) {
      onDateFilter(localDateFrom, localDateTo);
    }
  }, [localDateFrom, localDateTo, dueDateFrom, dueDateTo, onDateFilter]);

  const hasActiveFilters = searchQuery || dueDateFrom || dueDateTo;

  return (
    <div className="flex flex-wrap items-center gap-3 py-4">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by No, Description..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {localSearch && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setLocalSearch("");
              onSearch("");
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 ${(dueDateFrom || dueDateTo) ? "border-primary text-primary" : ""}`}
          >
            <Calendar className="h-4 w-4" />
            Due Date
            {(dueDateFrom || dueDateTo) && (
              <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date-from" className="text-sm">From</Label>
              <Input
                id="date-from"
                type="date"
                value={localDateFrom}
                onChange={(e) => setLocalDateFrom(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to" className="text-sm">To</Label>
              <Input
                id="date-to"
                type="date"
                value={localDateTo}
                onChange={(e) => setLocalDateTo(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleDateChange}
                className="flex-1"
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLocalDateFrom("");
                  setLocalDateTo("");
                  onDateFilter("", "");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Column Visibility */}
      <ColumnVisibility
        visibleColumns={visibleColumns}
        onColumnToggle={onColumnToggle}
        onResetColumns={onResetColumns}
      />

      {/* Clear All Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
