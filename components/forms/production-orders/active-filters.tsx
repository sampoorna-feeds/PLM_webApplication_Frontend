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
  userBranchCodes: string[];
}

export function ActiveFilters({
  searchQuery,
  columnFilters,
  onSearch,
  onColumnFilter,
  onClearFilters,
  userBranchCodes,
}: ActiveFiltersProps) {
  // Early return if no potential filters
  if (!searchQuery && Object.keys(columnFilters).length === 0) {
    return null;
  }

  // Build list of active filters
  const activeFilters: { key: string; label: string; displayValue: string }[] =
    [];

  if (searchQuery) {
    activeFilters.push({
      key: "search",
      label: "Search",
      displayValue: searchQuery,
    });
  }

  Object.entries(columnFilters).forEach(([columnId, filter]) => {
    // Skip default Status='Released' check - now default is ALL
    if (!filter.value && !filter.valueTo) return;

    // Skip Branch filter if it matches ALL user branches (default state)
    if (columnId === "Shortcut_Dimension_2_Code") {
      const selectedBranches = filter.value.split(",").sort().join(",");
      const allUserBranches = [...userBranchCodes].sort().join(",");

      // If they match (ignoring order), don't show the filter badge
      if (selectedBranches === allUserBranches) return;
    }

    const column = ALL_COLUMNS.find((c) => c.id === columnId);
    if (!column) return;

    let displayValue = filter.value;

    // Format number filter display
    if (column.filterType === "number") {
      if (filter.valueTo) {
        displayValue = `${filter.value || "0"} - ${filter.valueTo}`;
      } else if (filter.value.includes(":")) {
        const [op, num] = filter.value.split(":");
        const opLabels: Record<string, string> = { eq: "=", gt: ">", lt: "<" };
        displayValue = `${opLabels[op] || "="} ${num}`;
      }
    }

    // Format date filter display
    if (column.filterType === "date") {
      if (filter.value && filter.valueTo) {
        displayValue = `${filter.value} to ${filter.valueTo}`;
      } else if (filter.value) {
        displayValue = `from ${filter.value}`;
      } else if (filter.valueTo) {
        displayValue = `to ${filter.valueTo}`;
      }
    }

    // Format boolean filter display
    if (column.filterType === "boolean") {
      displayValue = filter.value === "true" ? "Yes" : "No";
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
    if (key === "search") {
      onSearch("");
    } else {
      onColumnFilter(key, "", "");
    }
  };

  return (
    <div className="shrink-0">
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <span className="text-muted-foreground text-xs">Active filters:</span>
        {activeFilters.map(({ key, label, displayValue }) => (
          <div
            key={key}
            className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5 text-sm"
          >
            <span className="font-medium">{label}:</span>
            <span className="text-muted-foreground max-w-30 truncate">
              {displayValue}
            </span>
            <button
              onClick={() => handleClear(key)}
              className="text-muted-foreground hover:text-foreground ml-0.5"
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
            className="h-6 px-2 text-xs"
          >
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
