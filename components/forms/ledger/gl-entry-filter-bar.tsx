"use client";

import React from "react";
import { Search, X, Download, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import type { GLEntryFilters, GLEntry } from "@/lib/api/services/gl-entry.service";
import { GLEntryColumnVisibility } from "./gl-entry-column-visibility";
import { GLEntryExportDialog } from "./gl-entry-export-dialog";
import { DynamicFilterBuilder } from "../report-ledger/dynamic-filter-builder";
import type { FilterCondition } from "../report-ledger/types";
import { ALL_COLUMNS } from "./gl-entry-column-config";
import { useState, useMemo } from "react";
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
  totalCount: number;
  currentFilterString: string;
  onFilterChange: (newFilters: Partial<GLEntryFilters>) => void;
  onClearFilters: () => void;
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  isLoading?: boolean;
  currentEntries?: GLEntry[];
}

export function GLEntryFilterBar({
  filters,
  visibleColumns,
  totalCount,
  currentFilterString,
  onFilterChange,
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

  return (
    <div className="flex items-center gap-4 flex-1">
      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-muted/20 px-4 py-2 rounded-xl border border-border/40 flex-1 max-sm:hidden max-w-sm group focus-within:border-primary/40 focus-within:bg-background/40 transition-all duration-300">
        <Search className="h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search entries..."
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

      <div className="flex-1 overflow-x-auto no-scrollbar ml-2 font-medium">
        {/* Dynamic Filter Placeholder */}
        <div className="flex items-center gap-2 h-11 px-3 bg-primary/5 border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary/80 opacity-60">
           <Filter className="h-3 w-3" />
           Analytical Filter Builder Active
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4 lg:ml-6">
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
        totalRecords={totalCount}
        visibleColumns={visibleColumns}
        currentEntries={currentEntries}
      />
    </div>
  );
}
