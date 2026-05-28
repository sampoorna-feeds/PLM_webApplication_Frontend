"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { 
  getInwardGateEntriesWithCount, 
  searchInwardGateEntries,
  type InwardGateEntryHeader 
} from "@/lib/api/services/inward-gate-entry.service";
import { InwardGateEntryTable } from "./inward-gate-entry-table";
import { 
  INWARD_GATE_ENTRY_COLUMNS, 
  DEFAULT_VISIBLE_COLUMNS,
  type SortDirection 
} from "./column-config";
import { InwardGateEntryColumnVisibility } from "./column-visibility";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCcw, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buildGateEntryFilterString } from "./utils/filter-builder";

export function InwardGateEntryPageContent() {
  const [entries, setEntries] = useState<InwardGateEntryHeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(200);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  
  const isLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const lastRequestId = useRef(0);
  const pageRef = useRef(1);

  const { openTab } = useFormStackContext();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchEntries = useCallback(async (reset = false) => {
    const requestId = ++lastRequestId.current;
    if (reset) {
      pageRef.current = 1;
      isLoadingRef.current = true;
      setIsLoading(true);
    } else {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
    }
    try {
      const filter = buildGateEntryFilterString({ 
        columnFilters, 
        allColumns: INWARD_GATE_ENTRY_COLUMNS 
      });

      const params = {
        $top: pageSize,
        $skip: (pageRef.current - 1) * pageSize,
        $orderby: sortColumn && sortDirection ? `${sortColumn} ${sortDirection}` : undefined,
        $filter: filter,
        searchTerm: debouncedSearchQuery || undefined,
      };

      const result = debouncedSearchQuery 
        ? await searchInwardGateEntries(params)
        : await getInwardGateEntriesWithCount(params);

      if (requestId !== lastRequestId.current) return;

      if (pageRef.current === 1) {
        setEntries(result.entries || []);
      } else {
        setEntries(prev => [...prev, ...(result.entries || [])]);
      }
      setTotalCount(result.totalCount ?? result.entries?.length ?? 0);
      const hasMoreData = (result.totalCount && result.totalCount > 0)
        ? pageRef.current * pageSize < result.totalCount
        : ((result.entries?.length || 0) === pageSize);
      setHasMore(hasMoreData);
      setCurrentPage(pageRef.current);
    } catch (error) {
      if (requestId !== lastRequestId.current) return;
      console.error("Error fetching inward gate entries:", error);
      if (pageRef.current === 1) {
        setEntries([]);
        setTotalCount(0);
      }
    } finally {
      if (requestId === lastRequestId.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
        isLoadingRef.current = false;
        isLoadingMoreRef.current = false;
      }
    }
  }, [pageSize, sortColumn, sortDirection, debouncedSearchQuery, columnFilters]);

  const loadMore = useCallback(() => {
    if (isLoadingRef.current || isLoadingMoreRef.current || !hasMore) return;
    pageRef.current += 1;
    fetchEntries(false);
  }, [hasMore, fetchEntries]);

  useEffect(() => {
    fetchEntries(true);
  }, [fetchEntries]);

  const handleRowClick = (entry: InwardGateEntryHeader) => {
    openTab("inward-gate-entry", {
      title: `Gate Entry: ${entry.No}`,
      context: { entry, mode: "view", refetch: () => fetchEntries(true) },
    });
  };

  const handleCreate = () => {
    openTab("inward-gate-entry", {
      title: "New Gate Entry",
      context: { mode: "create", refetch: () => fetchEntries(true) },
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
  };

  const handleColumnToggle = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId) 
        : [...prev, columnId]
    );
  };

  const handleResetColumns = () => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  const handleShowAllColumns = () => setVisibleColumns(INWARD_GATE_ENTRY_COLUMNS.map(c => c.id));

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setColumnFilters({});
  };

  const activeFiltersCount = Object.keys(columnFilters).length + (searchQuery ? 1 : 0);

  return (
    <div className="flex h-full flex-col p-6 [overflow-anchor:none]">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Inward Gate Entry</h1>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
            {totalCount} {totalCount === 1 ? "record" : "records"} found
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchEntries(true)} disabled={isLoading}>
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
          <div className="relative w-full max-w-sm">
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

        <InwardGateEntryColumnVisibility
          visibleColumns={visibleColumns}
          defaultColumns={INWARD_GATE_ENTRY_COLUMNS.filter(c => DEFAULT_VISIBLE_COLUMNS.includes(c.id))}
          optionalColumns={INWARD_GATE_ENTRY_COLUMNS.filter(c => !DEFAULT_VISIBLE_COLUMNS.includes(c.id))}
          onColumnToggle={handleColumnToggle}
          onResetColumns={handleResetColumns}
          onShowAllColumns={handleShowAllColumns}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <InwardGateEntryTable
          entries={entries}
          isLoading={isLoading}
          allColumns={INWARD_GATE_ENTRY_COLUMNS}
          visibleColumns={visibleColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          pageSize={pageSize}
          currentPage={currentPage}
          columnFilters={columnFilters}
          onSort={handleSort}
          onRowClick={handleRowClick}
          onColumnFilter={handleColumnFilter}
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
      </div>
    </div>
  );
}
