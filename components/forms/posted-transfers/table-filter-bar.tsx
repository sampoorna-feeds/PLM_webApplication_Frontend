"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TableFilterBarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function TableFilterBar({
  searchQuery,
  onSearch,
  onClearFilters,
  hasActiveFilters,
}: TableFilterBarProps) {
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

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2">
      <div className="relative max-w-sm min-w-[250px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by No, Location, Vehicle..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-10 pr-10 h-9"
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

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-9 px-3 text-xs gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Reset All Filters
        </Button>
      )}
    </div>
  );
}
