"use client";

import React from "react";
import { Search, X, Download, Plus, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import type { VendorLedgerFilters, VendorLedgerEntry } from "@/lib/api/services/vendor-ledger.service";
import { VendorColumnVisibility } from "./vendor-ledger-column-visibility";
import { 
  LEDGER_DEFAULT_COLUMNS, 
  OUTSTANDING_DEFAULT_COLUMNS, 
  OPTIONAL_COLUMNS 
} from "./vendor-ledger-column-config";
import { VendorLedgerExportDialog } from "./vendor-ledger-export-dialog";
import { DynamicFilterBuilder } from "../report-ledger/dynamic-filter-builder";
import type { FilterCondition } from "../report-ledger/types";
import { VENDOR_LEDGER_COLUMNS } from "@/components/forms/ledger/column-config";
import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface VendorLedgerFilterBarProps {
  filters: VendorLedgerFilters;
  visibleColumns: string[];
  totalCount: number;
  currentFilterString: string;
  humanReadableFilters: string[];
  onFilterChange: (newFilters: Partial<VendorLedgerFilters>) => void;
  onClearFilters: () => void;
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
  onAddAdditionalFilter: (filter: FilterCondition) => void;
  onRemoveAdditionalFilter: (index: number) => void;
  onSuccess?: () => void;
  isLoading?: boolean;
  openingBalance?: number;
  closingBalance?: number;
  currentEntries?: VendorLedgerEntry[];
}

export function VendorLedgerFilterBar({
  filters,
  visibleColumns,
  totalCount,
  currentFilterString,
  humanReadableFilters,
  onFilterChange,
  onClearFilters,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
  onAddAdditionalFilter,
  onRemoveAdditionalFilter,
  onSuccess,
  isLoading = false,
  openingBalance,
  closingBalance,
  currentEntries = [],
}: VendorLedgerFilterBarProps) {
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
  const handleVendorChange = (vendorNo: string) => {
    onFilterChange({ vendorNo });
  };

  return (
    <div className="flex items-center gap-4 flex-1">
      <div className="flex items-center gap-2">
        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-11 px-4 gap-3 bg-background/40 hover:bg-background/60 border-border/50 shadow-sm transition-all duration-300 rounded-xl",
                hasActiveDateFilter && "border-primary/50 bg-primary/5 shadow-primary/10"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                hasActiveDateFilter ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-start leading-none text-left">
                <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/80 mb-0.5">Date Range</span>
                <span className="text-xs font-bold whitespace-nowrap">{dateRangeText}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 border-border/50 shadow-2xl rounded-2xl overflow-hidden" align="start">
            <div className="p-4 bg-muted/30 border-b border-border/50">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm tracking-tight">Period Selection</h4>
                {hasActiveDateFilter && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onFilterChange({ fromDate: "", toDate: "" })}
                    className="h-7 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="date-from" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  From Date
                </Label>
                <DateInput
                  id="date-from"
                  value={filters.fromDate}
                  onChange={(val) => onFilterChange({ fromDate: val })}
                  className="w-full h-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all rounded-lg"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="date-to" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  To Date
                </Label>
                <DateInput
                  id="date-to"
                  value={filters.toDate}
                  onChange={(val) => onFilterChange({ toDate: val })}
                  className="w-full h-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all rounded-lg"
                />
              </div>
              
              <Button 
                className="w-full h-10 font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
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
            className="h-11 w-11 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-300 rounded-xl"
            title="Clear all filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 bg-muted/20 px-4 py-2 rounded-xl border border-border/40 flex-1 max-w-sm ml-2 group focus-within:border-primary/40 focus-within:bg-background/40 transition-all duration-300">
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
        <DynamicFilterBuilder
          filters={filters.additionalFilters || []}
          onAddFilter={onAddAdditionalFilter}
          onRemoveFilter={onRemoveAdditionalFilter}
          columnConfig={VENDOR_LEDGER_COLUMNS}
          excludedFields={["Vendor_No", "Posting_Date", "Entry_No"]}
        />
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

        <VendorColumnVisibility
          visibleColumns={visibleColumns}
          defaultColumns={filters.isOutstanding ? OUTSTANDING_DEFAULT_COLUMNS : LEDGER_DEFAULT_COLUMNS}
          optionalColumns={OPTIONAL_COLUMNS}
          onColumnToggle={onColumnToggle}
          onResetColumns={onResetColumns}
          onShowAllColumns={onShowAllColumns}
        />
      </div>

      <VendorLedgerExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        filterString={currentFilterString}
        totalRecords={totalCount}
        visibleColumns={visibleColumns}
        humanReadableFilters={humanReadableFilters}
        title={filters.isOutstanding ? "Outstanding Amount" : "Vendor Ledger"}
        filename={filters.isOutstanding ? "Vendor_Outstanding" : "Vendor_Ledger"}
        openingBalance={openingBalance}
        closingBalance={closingBalance}
        currentEntries={currentEntries}
      />
    </div>
  );
}
