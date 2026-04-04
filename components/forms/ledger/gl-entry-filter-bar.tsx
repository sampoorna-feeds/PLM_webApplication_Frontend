"use client";

import React from "react";
import { Search, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GLEntryFilters, GLEntry } from "@/lib/api/services/gl-entry.service";
import { GLEntryColumnVisibility } from "./gl-entry-column-visibility";
import { GLEntryExportDialog } from "./gl-entry-export-dialog";
import { DynamicFilterBuilder } from "../report-ledger/dynamic-filter-builder";
import type { FilterCondition } from "../report-ledger/types";
import { ALL_COLUMNS } from "./gl-entry-column-config";
import { useState } from "react";

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
  currentEntries?: GLEntry[];
}

export function GLEntryFilterBar({
  filters,
  visibleColumns,
  searchString,
  totalCount,
  currentFilterString,
  onFilterChange,
  onAdditionalFiltersChange,
  onClearFilters,
  onColumnToggle,
  onResetColumns,
  isLoading = false,
  currentEntries = [],
}: GLEntryFilterBarProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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
      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-muted/20 px-4 py-2 rounded-xl border border-border/40 flex-1 max-sm:hidden max-w-[280px] group focus-within:border-primary/40 focus-within:bg-background/40 transition-all duration-300">
        <Search className="h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search account names..."
          value={filters.search || ""}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-transparent border-none focus:ring-0 text-sm h-7 w-full placeholder:text-muted-foreground/40 font-medium outline-none"
        />
        {filters.search && (
          <button 
            onClick={() => handleSearchChange("")}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
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
          className="h-11 px-5 gap-2.5 border-border/50 bg-background/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 font-bold text-[10px] uppercase tracking-widest shadow-sm rounded-xl transition-all duration-300"
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
      />
    </div>
  );
}
