"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  getOutwardGateEntriesWithCount, 
  searchOutwardGateEntries,
  type OutwardGateEntryHeader 
} from "@/lib/api/services/outward-gate-entry.service";
import { OutwardGateEntryTable } from "./outward-gate-entry-table";
import { 
  OUTWARD_GATE_ENTRY_COLUMNS, 
  DEFAULT_VISIBLE_COLUMNS,
  type SortDirection 
} from "./column-config";
import { OutwardGateEntryColumnVisibility } from "./column-visibility";
import { OutwardGateEntryPaginationControls } from "./pagination-controls";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCcw, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buildGateEntryFilterString } from "./utils/filter-builder";

export function OutwardGateEntryPageContent() {
  const [entries, setEntries] = useState<OutwardGateEntryHeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  
  const { openTab } = useFormStackContext();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const filter = buildGateEntryFilterString({ 
        columnFilters, 
        allColumns: OUTWARD_GATE_ENTRY_COLUMNS 
      });

      const params = {
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
        $orderby: sortColumn && sortDirection ? `${sortColumn} ${sortDirection}` : undefined,
        $filter: filter,
        searchTerm: debouncedSearchQuery || undefined,
      };

      const result = debouncedSearchQuery 
        ? await searchOutwardGateEntries(params)
        : await getOutwardGateEntriesWithCount(params);

      setEntries(result.entries);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error fetching outward gate entries:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, sortColumn, sortDirection, debouncedSearchQuery, columnFilters]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRowClick = (entry: OutwardGateEntryHeader) => {
    openTab("outward-gate-entry", {
      title: `Gate Entry: ${entry.No}`,
      context: { entry, mode: "view", refetch: fetchEntries },
    });
  };

  const handleCreate = () => {
    openTab("outward-gate-entry", {
      title: "New Gate Entry",
      context: { mode: "create", refetch: fetchEntries },
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection(null);
      else setSortDirection("asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleColumnFilter = (columnId: string, value: string, valueTo?: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (!value && !valueTo) {
        delete next[columnId];
      } else {
        next[columnId] = { value, valueTo };
      }
      return next;
    });
    setCurrentPage(1);
  };

  const handleColumnToggle = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId) 
        : [...prev, columnId]
    );
  };

  const handleResetColumns = () => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  const handleShowAllColumns = () => setVisibleColumns(OUTWARD_GATE_ENTRY_COLUMNS.map(c => c.id));

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setColumnFilters({});
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasNextPage = currentPage < totalPages;
  const activeFiltersCount = Object.keys(columnFilters).length + (searchQuery ? 1 : 0);

  return (
    <div className="flex h-full flex-col p-6 [overflow-anchor:none]">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Outward Gate Entry</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEntries} disabled={isLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-sm:max-w-none max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by No., Transporter, Vehicle..."
              className="h-9 pl-8 text-xs font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearFilters}
              className="h-9 gap-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear Filters
              <Badge variant="secondary" className="ml-1 h-4 min-w-4 rounded-full px-1 text-[10px]">
                {activeFiltersCount}
              </Badge>
            </Button>
          )}
        </div>

        <OutwardGateEntryColumnVisibility
          visibleColumns={visibleColumns}
          defaultColumns={OUTWARD_GATE_ENTRY_COLUMNS.filter(c => DEFAULT_VISIBLE_COLUMNS.includes(c.id))}
          optionalColumns={OUTWARD_GATE_ENTRY_COLUMNS.filter(c => !DEFAULT_VISIBLE_COLUMNS.includes(c.id))}
          onColumnToggle={handleColumnToggle}
          onResetColumns={handleResetColumns}
          onShowAllColumns={handleShowAllColumns}
        />
      </div>

      <div className="flex-1 min-h-0">
        <OutwardGateEntryTable
          entries={entries}
          isLoading={isLoading}
          allColumns={OUTWARD_GATE_ENTRY_COLUMNS}
          visibleColumns={visibleColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          pageSize={pageSize}
          currentPage={currentPage}
          columnFilters={columnFilters}
          onSort={handleSort}
          onRowClick={handleRowClick}
          onColumnFilter={handleColumnFilter}
        />
      </div>

      <OutwardGateEntryPaginationControls
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
