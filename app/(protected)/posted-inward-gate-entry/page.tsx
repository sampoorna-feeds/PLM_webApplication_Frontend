"use client";

import { FormStackProvider, FormStackPanel, MiniAccessPanel } from "@/components/form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { usePostedGateEntries } from "@/components/forms/posted-gate-entry/use-posted-gate-entries";
import { PostedGateEntryTable } from "@/components/forms/posted-gate-entry/posted-gate-entry-table";
import { DEFAULT_VISIBLE_COLUMNS } from "@/components/forms/posted-gate-entry/column-config";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { PostedDocumentFilterForm, type DateRangeFilters } from "@/components/forms/posted-documents/posted-document-filter-form";

function PostedInwardGateEntryContent() {
  const {
    entries,
    isLoading,
    pageSize,
    currentPage,
    totalCount,
    totalPages,
    sortColumn,
    sortDirection,
    searchQuery,
    dateFilter,
    setDateFilter,
    onPageChange,
    onPageSizeChange,
    onSort,
    onSearch,
    onClearFilters,
    refetch,
  } = usePostedGateEntries("inward");

  const { openTab } = useFormStackContext();

  const handleRowClick = (entry: any) => {
    openTab("posted-inward-gate-entry", {
      title: `Posted Gate Entry: ${entry.No}`,
      context: { entry, mode: "view" },
    });
  };

  const handleApplyFilters = (filters: DateRangeFilters) => {
    setDateFilter(filters);
  };

  if (!dateFilter) {
    return (
      <PostedDocumentFilterForm
        title="Posted Inward Gate Entries"
        description="Select a date range to view processed inward gate entries"
        onApply={handleApplyFilters}
      />
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posted Inward Gate Entry</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">View processed inward gate entries</p>
            {dateFilter && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">
                {dateFilter.fromDate.split('-').reverse().join('/')} - {dateFilter.toDate.split('-').reverse().join('/')}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateFilter(null)}
            className="h-8 text-xs"
          >
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            Change Date Range
          </Button>
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by No., Transporter, Vehicle..."
              className="h-9 pl-8 text-xs font-medium"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9 gap-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <PostedGateEntryTable
          entries={entries}
          isLoading={isLoading}
          visibleColumns={DEFAULT_VISIBLE_COLUMNS}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={handleRowClick}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, totalCount)}</span> of{" "}
            <span className="font-medium text-foreground">{totalCount}</span> results
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            Previous
          </Button>
          <div className="text-xs font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PostedInwardGateEntryPage() {
  return (
    <FormStackProvider formScope="posted-inward-gate-entry">
      <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <PostedInwardGateEntryContent />
        </div>
        <FormStackPanel />
        <MiniAccessPanel />
      </div>
    </FormStackProvider>
  );
}
