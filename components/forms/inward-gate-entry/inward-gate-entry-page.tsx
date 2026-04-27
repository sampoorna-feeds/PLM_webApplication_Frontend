"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  getInwardGateEntries, 
  type InwardGateEntryHeader 
} from "@/lib/api/services/inward-gate-entry.service";
import { InwardGateEntryTable } from "./inward-gate-entry-table";
import { 
  INWARD_GATE_ENTRY_COLUMNS, 
  DEFAULT_VISIBLE_COLUMNS,
  type SortDirection 
} from "./column-config";
import { InwardGateEntryColumnVisibility } from "./column-visibility";
import { InwardGateEntryPaginationControls } from "./pagination-controls";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCcw, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function InwardGateEntryPageContent() {
  const [entries, setEntries] = useState<InwardGateEntryHeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  
  const { openTab } = useFormStackContext();

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getInwardGateEntries();
      setEntries(data);
    } catch (error) {
      console.error("Error fetching inward gate entries:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRowClick = (entry: InwardGateEntryHeader) => {
    openTab("inward-gate-entry", {
      title: `Gate Entry: ${entry.No}`,
      context: { entry, mode: "view", refetch: fetchEntries },
    });
  };

  const handleCreate = () => {
    openTab("inward-gate-entry", {
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
  const handleShowAllColumns = () => setVisibleColumns(INWARD_GATE_ENTRY_COLUMNS.map(c => c.id));

  const handleClearFilters = () => {
    setSearchQuery("");
    setColumnFilters({});
    setCurrentPage(1);
  };

  const filteredEntries = entries.filter((entry) => {
    // Global search
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        (entry.No || "").toLowerCase().includes(searchLower) ||
        (entry.Transporter_Name || "").toLowerCase().includes(searchLower) ||
        (entry.Vehicle_No || "").toLowerCase().includes(searchLower) ||
        (entry.Description || "").toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Column filters
    for (const [columnId, filter] of Object.entries(columnFilters)) {
      const value = entry[columnId as keyof InwardGateEntryHeader];
      const config = INWARD_GATE_ENTRY_COLUMNS.find(c => c.id === columnId);
      
      if (!config) continue;

      if (config.filterType === "text" || config.filterType === "select") {
        if (!filter.value) continue;
        const searchValues = filter.value.toLowerCase().split(",").map(v => v.trim());
        const entryValue = String(value || "").toLowerCase();
        if (!searchValues.some(v => entryValue.includes(v))) return false;
      }

      if (config.filterType === "number") {
        const numValue = Number(value || 0);
        if (filter.value.includes(":")) {
          const [op, val] = filter.value.split(":");
          const target = Number(val);
          if (op === "eq" && numValue !== target) return false;
          if (op === "gt" && numValue <= target) return false;
          if (op === "lt" && numValue >= target) return false;
        } else if (filter.value && filter.valueTo) {
          const min = Number(filter.value);
          const max = Number(filter.valueTo);
          if (numValue < min || numValue > max) return false;
        }
      }

      if (config.filterType === "date") {
        if (!value) return false;
        const entryDate = new Date(value as string);
        if (filter.value) {
          const fromDate = new Date(filter.value);
          if (entryDate < fromDate) return false;
        }
        if (filter.valueTo) {
          const toDate = new Date(filter.valueTo);
          if (entryDate > toDate) return false;
        }
      }
    }

    return true;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;
    const aVal = a[sortColumn as keyof InwardGateEntryHeader] ?? "";
    const bVal = b[sortColumn as keyof InwardGateEntryHeader] ?? "";
    
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const totalCount = sortedEntries.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedEntries = sortedEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasNextPage = currentPage < totalPages;
  const activeFiltersCount = Object.keys(columnFilters).length + (searchQuery ? 1 : 0);

  return (
    <div className="flex h-full flex-col p-6 [overflow-anchor:none]">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Inward Gate Entry</h1>
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
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by No., Transporter, Vehicle..."
              className="h-9 pl-8 text-xs font-medium"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
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

      <div className="flex-1 min-h-0">
        <InwardGateEntryTable
          entries={paginatedEntries}
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
        />
      </div>

      <InwardGateEntryPaginationControls
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
