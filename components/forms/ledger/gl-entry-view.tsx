"use client";

import { AccountSelect } from "@/components/forms/account-select";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";
import { GLEntryFilterBar } from "./gl-entry-filter-bar";
import { GLEntryTable } from "./gl-entry-table";
import { useGLEntry } from "./use-gl-entry";

export function GLEntryView() {
  const {
    entries,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    totalCount,
    openingBalance,
    closingBalance,
    debitSum,
    creditSum,
    loadMore,
    refetch,
    filters,
    onFilterChange,
    handleSearch,
    handleSort,
    handleColumnFilterChange,
    handleAdditionalFiltersChange,
    clearFilters,
    visibleColumns,
    setVisibleColumns,
    handleResetColumns,
    columnWidths,
    setColumnWidths,
    saveColumnWidths,
    columnOrder,
    setColumnOrder,
    saveColumnOrder,
    frozenColumns,
    setFrozenColumns,
    saveFrozenColumns,
    currentFilterString,
  } = useGLEntry();

  return (
    <div className="bg-background/40 flex h-full w-full flex-col gap-5 overflow-hidden p-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 px-1 md:flex-row md:items-end">
        <div className="space-y-1">
          <h1 className="text-foreground/90 text-3xl font-extrabold tracking-tight uppercase">
            GL Entry
          </h1>
          <p className="text-muted-foreground max-w-lg text-sm font-medium">
            Complete general ledger transaction history with real-time tracking
            and advanced analytical filtering
          </p>
        </div>

        <div className="bg-muted/20 border-border/40 flex items-center gap-3 rounded-xl border p-1.5 shadow-sm backdrop-blur-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="hover:bg-primary/10 hover:text-primary h-8 rounded-lg px-4 text-[10px] font-black tracking-widest uppercase transition-all duration-300"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-3.5 w-3.5" />
            )}
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Filter Orchestration Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] items-center gap-4 bg-card/40 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-500">
        <div className="relative group">
          <AccountSelect
            accountType="G/L Account"
            value={filters.accountNo || ""}
            onChange={(val: string) => onFilterChange({ accountNo: val })}
            placeholder="Search for a G/L account..."
            className="h-11 w-full bg-background/50 border-primary/20 group-hover:border-primary/50 text-sm font-medium pl-10 pr-4 rounded-xl shadow-inner transition-all duration-300"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60 group-hover:text-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
        </div>

        <GLEntryFilterBar
          filters={filters}
          visibleColumns={visibleColumns}
          totalCount={totalCount}
          currentFilterString={currentFilterString}
          searchString={filters.search}
          onFilterChange={onFilterChange}
          onAdditionalFiltersChange={handleAdditionalFiltersChange}
          onClearFilters={clearFilters}
          onColumnToggle={setVisibleColumns}
          onResetColumns={handleResetColumns}
          isLoading={isLoading}
          openingBalance={openingBalance}
          closingBalance={closingBalance}
          currentEntries={entries}
        />
      </div>

      {/* Main Table Container */}
      <div className="bg-card/10 border-border/40 group flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md">
        <GLEntryTable
          entries={entries}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasMore={hasNextPage}
          loadMore={loadMore}
          openingBalance={openingBalance}
          closingBalance={closingBalance}
          debitSum={debitSum}
          creditSum={creditSum}
          onSort={handleSort}
          onColumnFilterChange={handleColumnFilterChange}
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
          frozenColumns={frozenColumns}
          setFrozenColumns={setFrozenColumns}
          saveFrozenColumns={saveFrozenColumns}
          accountNo={filters.accountNo}
          fromDate={filters.fromDate}
          toDate={filters.toDate}
        />
      </div>
    </div>
  );
}
