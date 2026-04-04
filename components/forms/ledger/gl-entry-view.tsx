"use client";

import { Button } from "@/components/ui/button";
import { buildGLFilterString } from "@/lib/api/services/gl-entry.service";
import { Loader2, RefreshCcw } from "lucide-react";
import { useMemo } from "react";
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

  const currentFilterString = useMemo(
    () => buildGLFilterString(filters),
    [filters],
  );

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
      <div className="bg-card/40 border-border/50 flex items-center gap-4 rounded-2xl border p-4 shadow-xl backdrop-blur-xl transition-all duration-500 hover:shadow-2xl">
        <GLEntryFilterBar
          filters={filters}
          visibleColumns={visibleColumns}
          totalCount={totalCount}
          currentFilterString={currentFilterString}
          searchString={filters.search}
          onFilterChange={(newFilters) => {
            if (newFilters.search !== undefined)
              handleSearch(newFilters.search);
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
      <div className="bg-card/10 border-border/40 group flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md">
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
