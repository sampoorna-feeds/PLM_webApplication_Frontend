"use client";

import React, { useMemo, useState } from "react";
import { Search, X, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import type { GLEntryFilters, GLEntry } from "@/lib/api/services/gl-entry.service";
import { GLEntryColumnVisibility } from "./gl-entry-column-visibility";
import { GLEntryExportDialog } from "./gl-entry-export-dialog";
import { DynamicFilterBuilder } from "../report-ledger/dynamic-filter-builder";
import type { FilterCondition } from "../report-ledger/types";
import { ALL_COLUMNS } from "./gl-entry-column-config";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface GLEntryFilterBarProps {
  filters: GLEntryFilters;
  visibleColumns: string[];
  searchString?: string;
  totalCount: number;
  currentFilterString: string;
  onFilterChange: (newFilters: Partial<GLEntryFilters>) => void;
  onAdditionalFiltersChange: (filters: FilterCondition[]) => void;
  onClearFilters: () => void;
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  isLoading?: boolean;
  openingBalance?: number;
  closingBalance?: number;
  currentEntries?: GLEntry[];
}

export function GLEntryFilterBar({
  filters,
  visibleColumns,
  totalCount,
  currentFilterString,
  onFilterChange,
  onAdditionalFiltersChange,
  onClearFilters,
  onColumnToggle,
  onResetColumns,
  isLoading = false,
  openingBalance,
  closingBalance,
  currentEntries = [],
}: GLEntryFilterBarProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const hasActiveDateFilter = filters.fromDate || filters.toDate;

  const dateRangeText = useMemo(() => {
    if (!filters.fromDate && !filters.toDate) return "All Dates";
    const from = filters.fromDate ? format(new Date(filters.fromDate), "dd MMM yy") : "...";
    const to = filters.toDate ? format(new Date(filters.toDate), "dd MMM yy") : "...";
    return `${from} - ${to}`;
  }, [filters.fromDate, filters.toDate]);

  const handleSearchChange = (val: string) => {
    onFilterChange({ search: val });
  };

  const handleAddFilter = (newFilter: FilterCondition) => {
    const currentAdditional = filters.additionalFilters || [];
    onAdditionalFiltersChange([...currentAdditional, newFilter]);
  };

  const handleRemoveFilter = (index: number) => {
    const currentAdditional = filters.additionalFilters || [];
    onAdditionalFiltersChange(currentAdditional.filter((_, i) => i !== index));
  };

  return (
    <div className="flex items-center gap-4 flex-1">
      {/* Date Range Picker */}
      <div className="flex items-center gap-2">
        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-3 gap-2 shadow-sm",
                hasActiveDateFilter && "border-primary bg-primary/5"
              )}
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-start leading-none text-left">
                <span className="text-xs text-muted-foreground mb-1">Period</span>
                <span className="text-sm font-medium whitespace-nowrap">{dateRangeText}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 shadow-lg rounded-md overflow-hidden" align="start">
            <div className="p-4 bg-muted/50 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Period Selection</h4>
                {hasActiveDateFilter && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onFilterChange({ fromDate: "", toDate: "" })}
                    className="h-7 text-xs text-destructive"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                  From Date
                </Label>
                <DateInput
                  id="date-from"
                  value={filters.fromDate || ""}
                  onChange={(val) => onFilterChange({ fromDate: val })}
                  className="w-full h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                  To Date
                </Label>
                <DateInput
                  id="date-to"
                  value={filters.toDate || ""}
                  onChange={(val) => onFilterChange({ toDate: val })}
                  className="w-full h-9"
                />
              </div>
              
              <Button 
                className="w-full h-9 text-xs font-medium"
                onClick={() => setFilterPopoverOpen(false)}
              >
                Apply Filter
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveDateFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 w-9 p-0 text-muted-foreground"
            title="Clear all filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-md border flex-1 max-sm:hidden max-w-[240px] group focus-within:border-primary transition-all">
        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search entries..."
          value={filters.search || ""}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-transparent border-none focus:ring-0 text-sm h-7 w-full placeholder:text-muted-foreground/50 outline-none"
        />
        {filters.search && (
          <button 
            onClick={() => handleSearchChange("")}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex-1 ml-2">
        <DynamicFilterBuilder
          columnConfig={ALL_COLUMNS}
          filters={filters.additionalFilters || []}
          onAddFilter={handleAddFilter}
          onRemoveFilter={handleRemoveFilter}
          excludedFields={[]}
        />
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4 lg:ml-6 text-foreground">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 shadow-sm"
          onClick={() => setExportDialogOpen(true)}
          disabled={totalCount === 0}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>

        <GLEntryColumnVisibility
          visibleColumns={visibleColumns}
          onColumnToggle={onColumnToggle}
          onResetColumns={onResetColumns}
        />
      </div>

      <GLEntryExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        filterString={currentFilterString}
        searchString={filters.search}
        totalRecords={totalCount}
        visibleColumns={visibleColumns}
        currentEntries={currentEntries}
        openingBalance={openingBalance}
        closingBalance={closingBalance}
      />
    </div>
  );
}
