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
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function InwardGateEntryPageContent() {
  const [entries, setEntries] = useState<InwardGateEntryHeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  
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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

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

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      entry.No.toLowerCase().includes(searchLower) ||
      entry.Transporter_Name?.toLowerCase().includes(searchLower) ||
      entry.Description?.toLowerCase().includes(searchLower)
    );
  });

  // Sort filtered entries
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn] ?? "";
    const bVal = b[sortColumn] ?? "";
    
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

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

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            className="h-9 pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <InwardGateEntryTable
          entries={sortedEntries}
          isLoading={isLoading}
          allColumns={INWARD_GATE_ENTRY_COLUMNS}
          visibleColumns={DEFAULT_VISIBLE_COLUMNS}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={handleRowClick}
        />
      </div>
    </div>
  );
}
