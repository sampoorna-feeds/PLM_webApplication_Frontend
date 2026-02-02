"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ALL_COLUMNS } from "./column-config";

interface ActiveFiltersProps {
  searchQuery: string;
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  onSearch: (query: string) => void;
  onColumnFilter: (columnId: string, value: string, valueTo?: string) => void;
  onClearFilters: () => void;
}

export function ActiveFilters({
  searchQuery,
  columnFilters,
  onSearch,
  onColumnFilter,
  onClearFilters,
}: ActiveFiltersProps) {
  // Build list of active filters
  const activeFilters: { key: string; label: string; displayValue: string }[] = [];

  if (searchQuery) {
    activeFilters.push({
      key: 'search',
      label: 'Search',
      displayValue: searchQuery,
    });
  }

  Object.entries(columnFilters).forEach(([columnId, filter]) => {
    // Skip default Status='Released'
    if (columnId === 'Status' && filter.value === 'Released') return;
    if (!filter.value && !filter.valueTo) return;

    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (!column) return;

    let displayValue = filter.value;

    // Format number filter display
    if (column.filterType === 'number') {
      if (filter.valueTo) {
        displayValue = `${filter.value || '0'} - ${filter.valueTo}`;
      } else if (filter.value.includes(':')) {
        const [op, num] = filter.value.split(':');
        const opLabels: Record<string, string> = { eq: '=', gt: '>', lt: '<' };
        displayValue = `${opLabels[op] || '='} ${num}`;
      }
    }

    // Format date filter display
    if (column.filterType === 'date') {
      if (filter.value && filter.valueTo) {
        displayValue = `${filter.value} to ${filter.valueTo}`;
      } else if (filter.value) {
        displayValue = `from ${filter.value}`;
      } else if (filter.valueTo) {
        displayValue = `to ${filter.valueTo}`;
      }
    }

    // Format boolean filter display
    if (column.filterType === 'boolean') {
      displayValue = filter.value === 'true' ? 'Yes' : 'No';
    }

    activeFilters.push({
      key: columnId,
      label: column.label,
      displayValue,
    });
  });

  if (activeFilters.length === 0) {
    return null;
  }

  const handleClear = (key: string) => {
    if (key === 'search') {
      onSearch('');
    } else {
      onColumnFilter(key, '', '');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      <span className="text-xs text-muted-foreground">Active filters:</span>
      {activeFilters.map(({ key, label, displayValue }) => (
        <div
          key={key}
          className="flex items-center gap-1 bg-muted text-sm px-2 py-0.5 rounded-full"
        >
          <span className="font-medium">{label}:</span>
          <span className="text-muted-foreground max-w-[120px] truncate">{displayValue}</span>
          <button
            onClick={() => handleClear(key)}
            className="ml-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {activeFilters.length > 1 && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-6 px-2 text-xs">
          Clear All
        </Button>
      )}
    </div>
  );
}
