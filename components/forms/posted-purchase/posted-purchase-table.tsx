"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PostedPurchaseHeader } from "@/lib/api/services/posted-purchase.service";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Printer, Loader2 } from "lucide-react";
import { POSTED_PURCHASE_COLUMNS } from "./column-config";
import { PostedPurchaseColumnFilter } from "./column-filter";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PostedPurchaseTableProps {
  documents: PostedPurchaseHeader[];
  isLoading: boolean;
  sortColumn: string | null;
  sortDirection: "asc" | "desc" | null;
  onSort: (column: string) => void;
  onRowClick: (doc: PostedPurchaseHeader) => void;
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  onColumnFilter: (columnId: string, value: string, valueTo?: string) => void;
  visibleColumns: string[];
  onPrint?: (doc: PostedPurchaseHeader) => Promise<void>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function PostedPurchaseTable({
  documents,
  isLoading,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  columnFilters,
  onColumnFilter,
  visibleColumns,
  onPrint,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: PostedPurchaseTableProps) {
  const [printingDocNo, setPrintingDocNo] = useState<string | null>(null);
  const activeColumns = POSTED_PURCHASE_COLUMNS.filter((c) =>
    visibleColumns.includes(c.id),
  );

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
        root: scrollContainerRef.current
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
    if (sortColumn !== columnId)
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />;
    if (sortDirection === "asc")
      return <ArrowUp className="ml-1 h-3.5 w-3.5" />;
    if (sortDirection === "desc")
      return <ArrowDown className="ml-1 h-3.5 w-3.5" />;
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />;
  };

  const formatValue = (doc: PostedPurchaseHeader, columnId: string) => {
    const value = doc[columnId];
    if (value === null || value === undefined) return "-";
    if (columnId === "Posting_Date" || columnId === "Document_Date") {
      try {
        return format(new Date(value as string), "dd/MM/yyyy");
      } catch {
        return value as string;
      }
    }
    return String(value);
  };

  return (
    <div className="bg-card rounded-md border shadow-sm flex flex-col flex-1 min-h-0 w-full overflow-hidden">
      <Table containerRef={scrollContainerRef} containerClassName="flex-1 min-h-0 overflow-auto">
        <TableHeader className="sticky top-0 z-10 bg-muted shadow-sm">
          <TableRow className="hover:bg-muted/50 border-b">
            {onPrint && (
              <TableHead className="h-10 px-4 py-2 text-[11px] font-bold uppercase text-muted-foreground text-center">
                Actions
              </TableHead>
            )}
            {activeColumns.map((col) => (
              <TableHead key={col.id} className="h-10 px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center text-[11px] font-bold whitespace-nowrap uppercase transition-colors"
                    onClick={() => onSort(col.id)}
                  >
                    {col.label}
                    {renderSortIcon(col.id)}
                  </div>
                  {col.filterType && (
                    <div className="flex items-center">
                      <PostedPurchaseColumnFilter
                        column={col}
                        value={columnFilters[col.id]?.value || ""}
                        valueTo={columnFilters[col.id]?.valueTo || ""}
                        onChange={(val, valTo) =>
                          onColumnFilter(col.id, val, valTo)
                        }
                      />
                    </div>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-b last:border-0">
                {onPrint && (
                  <TableCell className="p-4">
                    <Skeleton className="h-4 w-8 mx-auto opacity-50" />
                  </TableCell>
                )}
                {activeColumns.map((col) => (
                  <TableCell key={col.id} className="p-4">
                    <Skeleton className="h-4 w-full opacity-50" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : documents.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={activeColumns.length + (onPrint ? 1 : 0)}
                className="text-muted-foreground h-24 text-center text-sm italic"
              >
                No posted purchase documents found.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {documents.map((doc) => (
                <TableRow
                  key={doc.No}
                  tabIndex={0}
                  className="group border-b transition-colors last:border-0 cursor-default outline-none hover:bg-muted/30 focus:bg-primary/10"
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
                      onRowClick(doc);
                    }
                  }}
                >
                  {onPrint && (
                    <TableCell className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={async () => {
                                setPrintingDocNo(doc.No);
                                try {
                                  await onPrint(doc);
                                } finally {
                                  setPrintingDocNo(null);
                                }
                              }}
                              disabled={printingDocNo === doc.No}
                            >
                              {printingDocNo === doc.No ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Printer className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Print Report</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  )}
                  {activeColumns.map((col) => (
                    <TableCell
                      key={col.id}
                      className="text-foreground/90 group-hover:text-foreground p-4 text-xs font-medium whitespace-nowrap"
                    >
                      {col.id === "No" ? (
                        <span
                          className="text-primary cursor-pointer hover:underline underline-offset-2"
                          onClick={(e) => { e.stopPropagation(); onRowClick(doc); }}
                        >
                          {formatValue(doc, col.id)}
                        </span>
                      ) : (
                        formatValue(doc, col.id)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {!isLoading && (
                <TableRow ref={sentinelRef}>
                  <TableCell colSpan={activeColumns.length + (onPrint ? 1 : 0)} className="h-px p-0">
                    {isLoadingMore && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    )}
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
