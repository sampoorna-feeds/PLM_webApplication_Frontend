"use client";

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw, LayoutGrid } from "lucide-react";
import { useGLEntry } from "./use-gl-entry";
import { GLEntryFilterBar } from "./gl-entry-filter-bar";
import { GLEntryTable } from "./gl-entry-table";
import { buildGLFilterString } from "@/lib/api/services/gl-entry.service";
import { useMemo } from "react";

export function GLEntryView() {
  const {
    entries,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    totalCount,
    loadMore,
    refetch,
    filters,
    handleSearch,
    handleSort,
    handleColumnFilterChange,
    handleAdditionalFiltersChange,
    clearFilters,
    visibleColumns,
    setVisibleColumns,
    handleResetColumns,
  } = useGLEntry();

  const currentFilterString = useMemo(() => buildGLFilterString(filters), [filters]);

  return (
    <div className="flex flex-col h-full w-full gap-5 p-6 bg-background/40 overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Financial Ledger</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90 uppercase">GL Entry</h1>
          <p className="text-sm text-muted-foreground font-medium max-w-lg">
            Complete general ledger transaction history with real-time tracking and advanced analytical filtering
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-muted/20 p-1.5 rounded-xl border border-border/40 backdrop-blur-md shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all duration-300 rounded-lg"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
            ) : (
              <RefreshCcw className="mr-2 h-3.5 w-3.5" />
            )}
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Filter Orchestration Bar */}
      <div className="flex items-center gap-4 bg-card/40 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500">
        <GLEntryFilterBar
          filters={filters}
          visibleColumns={visibleColumns}
          totalCount={totalCount}
          currentFilterString={currentFilterString}
          searchString={filters.search}
          onFilterChange={(newFilters) => {
            if (newFilters.search !== undefined) handleSearch(newFilters.search);
          }}
          onAdditionalFiltersChange={handleAdditionalFiltersChange}
          onClearFilters={clearFilters}
          onColumnToggle={setVisibleColumns}
          onResetColumns={handleResetColumns}
          isLoading={isLoading}
          currentEntries={entries}
        />
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 bg-card/10 backdrop-blur-md rounded-2xl border border-border/40 shadow-2xl overflow-hidden flex flex-col group">
        <GLEntryTable
          entries={entries}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasMore={hasNextPage}
          loadMore={loadMore}
          onSort={handleSort}
          onColumnFilterChange={handleColumnFilterChange}
          sortField={filters.sortField}
          sortOrder={filters.sortOrder}
          columnFilters={filters.columnFilters}
          visibleColumns={visibleColumns}
        />
      </div>
    </div>
  );
}
