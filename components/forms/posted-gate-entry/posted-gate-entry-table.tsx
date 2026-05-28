"use client";

import { useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { type PostedGateEntryHeader } from "@/lib/api/services/posted-gate-entry.service";
import { type SortDirection, POSTED_GATE_ENTRY_COLUMNS } from "./column-config";
import { format } from "date-fns";
import { PostedGateEntryColumnFilter } from "./column-filter";

interface PostedGateEntryTableProps {
  entries: PostedGateEntryHeader[];
  isLoading: boolean;
  visibleColumns: string[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  columnFilters?: Record<string, { value: string; valueTo?: string }>;
  onColumnFilter?: (columnId: string, value: string, valueTo?: string) => void;
  onSort: (column: string) => void;
  onRowClick: (entry: PostedGateEntryHeader) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function PostedGateEntryTable({
  entries,
  isLoading,
  visibleColumns,
  sortColumn,
  sortDirection,
  columnFilters = {},
  onColumnFilter,
  onSort,
  onRowClick,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: PostedGateEntryTableProps) {
  const columns = POSTED_GATE_ENTRY_COLUMNS.filter((col) => visibleColumns.includes(col.id));

  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore?.();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: "100px",
      },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    if (sortDirection === "asc") return <ArrowUp className="ml-2 h-4 w-4" />;
    if (sortDirection === "desc") return <ArrowDown className="ml-2 h-4 w-4" />;
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
  };

  const formatValue = (entry: PostedGateEntryHeader, columnId: string) => {
    const value = entry[columnId];
    if (value === null || value === undefined) return "-";
    if (columnId === "Document_Date" || columnId === "Posting_Date") {
      try {
        return format(new Date(value as string), "dd/MM/yyyy");
      } catch {
        return value as string;
      }
    }
    return String(value);
  };

  return (
    <div className="rounded-md border bg-card flex flex-col flex-1 min-h-0 w-full overflow-hidden shadow-sm">
      <Table containerRef={scrollContainerRef} containerClassName="flex-1 min-h-0 overflow-auto">
        <TableHeader className="sticky top-0 z-10 bg-muted shadow-sm">
          <TableRow className="bg-muted/50">
            {columns.map((col) => {
              const filter = columnFilters[col.id];
              return (
                <TableHead
                  key={col.id}
                  className="whitespace-nowrap text-xs font-bold uppercase text-muted-foreground transition-colors hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <div
                      className="flex items-center cursor-pointer select-none"
                      onClick={() => onSort(col.id)}
                    >
                      {col.label}
                      {renderSortIcon(col.id)}
                    </div>
                    {onColumnFilter && col.filterable && (
                      <PostedGateEntryColumnFilter
                        column={col}
                        value={filter?.value || ""}
                        valueTo={filter?.valueTo}
                        onChange={(val, valTo) => onColumnFilter(col.id, val, valTo)}
                      />
                    )}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
               <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.id}>
                    <Skeleton className="h-4 w-full opacity-50" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No posted gate entries found.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {entries.map((entry) => (
                <TableRow
                  key={entry.No}
                  tabIndex={0}
                  className="transition-colors cursor-default outline-none hover:bg-muted/50 focus:bg-primary/10"
                  onClick={(e) => (e.currentTarget as HTMLElement).focus()}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const next = e.currentTarget.nextElementSibling as HTMLElement;
                      if (next?.tabIndex >= 0) next.focus();
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const prev = e.currentTarget.previousElementSibling as HTMLElement;
                      if (prev?.tabIndex >= 0) prev.focus();
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      onRowClick(entry);
                    }
                  }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} className="whitespace-nowrap text-xs font-medium">
                      {col.id === "No" ? (
                        <span
                          className="text-primary cursor-pointer hover:underline underline-offset-2"
                          onClick={(e) => { e.stopPropagation(); onRowClick(entry); }}
                        >
                          {formatValue(entry, col.id)}
                        </span>
                      ) : (
                        formatValue(entry, col.id)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {!isLoading && (
                <TableRow ref={sentinelRef}>
                  <TableCell colSpan={columns.length} className="p-0 border-0 bg-transparent">
                    <div className="w-full flex items-center justify-center transition-all duration-200">
                      {isLoadingMore ? (
                        <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground font-medium animate-pulse">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span>Loading more records...</span>
                        </div>
                      ) : (
                        <div className="h-4 w-full" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
