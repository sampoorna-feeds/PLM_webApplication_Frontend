"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_COLUMNS } from "./column-config";

interface QCReceiptActiveFiltersProps {
  searchQuery: string;
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  onSearch: (query: string) => void;
  onColumnFilter: (columnId: string, value: string, valueTo?: string) => void;
  onClearFilters: () => void;
}

export function QCReceiptActiveFilters({
  searchQuery,
  columnFilters,
  onSearch,
  onColumnFilter,
  onClearFilters,
}: QCReceiptActiveFiltersProps) {
  const activeFilters: { key: string; label: string; displayValue: string }[] = [];

  if (searchQuery) {
    activeFilters.push({
      key: "search",
      label: "Search",
      displayValue: searchQuery,
    });
  }

  Object.entries(columnFilters).forEach(([columnId, filter]) => {
    if (!filter.value && !filter.valueTo) return;
    const column = ALL_COLUMNS.find((c) => c.id === columnId);
    if (!column) return;

    let displayValue = filter.value;

    if (column.filterType === "number") {
      if (filter.valueTo) {
        displayValue = `${filter.value || "0"} - ${filter.valueTo}`;
      } else if (filter.value.includes(":")) {
        const [op, num] = filter.value.split(":");
        const opLabels: Record<string, string> = { eq: "=", gt: ">", lt: "<" };
        displayValue = `${opLabels[op] || "="} ${num}`;
      }
    }

    if (column.filterType === "date") {
      if (filter.value && filter.valueTo) {
        displayValue = `${filter.value} to ${filter.valueTo}`;
      } else if (filter.value) {
        displayValue = `from ${filter.value}`;
      } else if (filter.valueTo) {
        displayValue = `to ${filter.valueTo}`;
      }
    }

    activeFilters.push({
      key: columnId,
      label: column.label,
      displayValue,
    });
  });

  if (activeFilters.length === 0) return null;

  const handleClear = (key: string) => {
    if (key === "search") {
      onSearch("");
    } else {
      onColumnFilter(key, "", "");
    }
  };

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-2 pb-3">
      <span className="text-muted-foreground text-xs font-medium px-1">Active filters:</span>
      {activeFilters.map(({ key, label, displayValue }) => (
        <div
          key={key}
          className="bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/20"
        >
          <span>{label}:</span>
          <span className="max-w-[150px] truncate">{displayValue}</span>
          <button
            type="button"
            onClick={() => handleClear(key)}
            className="hover:text-foreground/80 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {activeFilters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-6 px-2 text-[10px] font-bold uppercase hover:bg-destructive/10 hover:text-destructive"
        >
          Reset All
        </Button>
      )}
    </div>
  );
}
