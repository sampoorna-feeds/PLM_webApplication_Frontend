"use client";

import { useState } from "react";
import { AccountSelect } from "@/components/forms/account-select";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw, ChevronDown, FileText } from "lucide-react";
import { GLEntryFilterBar } from "./gl-entry-filter-bar";
import { GLEntryTable } from "./gl-entry-table";
import { useGLEntry } from "./use-gl-entry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GLEntryReportDialog } from "./gl-entry-report-dialog";

export function GLEntryView() {
  const {
    entries,
    isLoading,
    isFetchingNextPage,
    hasMore,
    totalCount,
    openingBalance,
    closingBalance,
    debitSum,
    creditSum,
    loadMore,
    refetch,
    filters,
    onFilterChange,
    onSort,
    onColumnFilterChange,
    onAdditionalFiltersChange,
    onClearFilters,
    visibleColumns,
    onColumnToggle,
    onResetColumns,
    columnWidths,
    setColumnWidths,
    saveColumnWidths,
    columnOrder,
    setColumnOrder,
    saveColumnOrder,
    currentFilterString,
  } = useGLEntry();

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<"CashBook" | "DayBook">("DayBook");

  const handleOpenReport = (type: "CashBook" | "DayBook") => {
    setSelectedReportType(type);
    setReportDialogOpen(true);
  };

  return (
    <div className="flex h-full w-full flex-col gap-2 p-4 overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">GL Entry</h1>
          <p className="text-sm text-muted-foreground">
            Complete general ledger transaction history with real-time tracking
          </p>
        </div>

        <div className="flex items-center gap-3 bg-muted/50 p-1 rounded-lg border shadow-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs gap-1.5"
                disabled={isLoading}
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                Reports
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleOpenReport("DayBook")}>
                Day Book Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenReport("CashBook")}>
                Cash Book Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8 px-3 text-xs"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Orchestration Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-card border p-4 rounded-lg shadow-sm">
        <div className="w-full md:w-[380px]">
          <AccountSelect
            accountType="G/L Account"
            value={filters.accountNo || ""}
            onChange={(val: string) => onFilterChange({ accountNo: val })}
            placeholder="Search for a G/L account..."
            className="h-9 w-full"
          />
        </div>

        <GLEntryFilterBar
          filters={filters}
          visibleColumns={visibleColumns}
          totalCount={totalCount}
          currentFilterString={currentFilterString}
          onFilterChange={onFilterChange}
          onAdditionalFiltersChange={onAdditionalFiltersChange}
          onClearFilters={onClearFilters}
          onColumnToggle={onColumnToggle}
          onResetColumns={onResetColumns}
          isLoading={isLoading}
          openingBalance={openingBalance}
          closingBalance={closingBalance}
          currentEntries={entries}
        />
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 bg-card rounded-lg border shadow-sm overflow-hidden flex flex-col">
        <GLEntryTable
          entries={entries}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasMore={hasMore}
          loadMore={loadMore}
          openingBalance={openingBalance}
          closingBalance={closingBalance}
          debitSum={debitSum}
          creditSum={creditSum}
          onSort={onSort}
          onColumnFilterChange={onColumnFilterChange}
          sortField={filters.sortField}
          sortOrder={filters.sortOrder}
          columnFilters={filters.columnFilters}
          visibleColumns={visibleColumns}
          columnWidths={columnWidths}
          setColumnWidths={setColumnWidths}
          saveColumnWidths={saveColumnWidths}
          columnOrder={columnOrder}
          setColumnOrder={setColumnOrder}
          saveColumnOrder={saveColumnOrder}
          accountNo={filters.accountNo}
          fromDate={filters.fromDate}
          toDate={filters.toDate}
        />
      </div>

      <GLEntryReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        reportType={selectedReportType}
        onReportTypeChange={setSelectedReportType}
        filters={filters}
      />
    </div>
  );
}
