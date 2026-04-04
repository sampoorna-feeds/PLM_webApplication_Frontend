"use client";

import React from "react";
import { Search, X, Download, Plus, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import type { VendorLedgerFilters } from "@/lib/api/services/vendor-ledger.service";
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
    <div className="flex items-center gap-3 flex-1">
      <div className="flex items-center gap-2">
        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-10 px-3 gap-2 border shadow-sm hover:bg-muted font-medium min-w-[140px] justify-start",
                hasActiveDateFilter && "border-primary bg-primary/5"
              )}
            >
              <Filter className={cn("h-4 w-4", hasActiveDateFilter && "text-primary")} />
              <div className="flex flex-col items-start leading-none text-left">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Date Filter</span>
                <span className="text-xs truncate max-w-[120px]">{dateRangeText}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filter by Date</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onFilterChange({ fromDate: "", toDate: "" })}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Reset
                </Button>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-from" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    From Date
                  </Label>
                  <DateInput
                    id="date-from"
                    value={filters.fromDate}
                    onChange={(val) => onFilterChange({ fromDate: val })}
                    className="w-full h-10 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-to" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    To Date
                  </Label>
                  <DateInput
                    id="date-to"
                    value={filters.toDate}
                    onChange={(val) => onFilterChange({ toDate: val })}
                    className="w-full h-10 transition-colors"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveDateFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 px-2 text-muted-foreground hover:text-destructive transition-colors"
            title="Clear all filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 bg-muted/20 px-3 py-1 rounded-lg border border-border/40 flex-1 max-w-sm ml-2">
        <Search className="h-4 w-4 text-muted-foreground mr-1" />
        <input
          type="text"
          placeholder="Search ledger entries..."
          value={filters.search || ""}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-transparent border-none focus:ring-0 text-sm h-8 w-full placeholder:text-muted-foreground/60"
        />
        {filters.search && (
          <button 
            onClick={() => handleSearchChange("")}
            className="p-1 hover:bg-muted rounded-full transition-colors"
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

      <div className="flex items-center gap-2 shrink-0 ml-4">

        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 gap-2 border shadow-sm hover:bg-muted font-medium"
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
      />
    </div>
  );
}
