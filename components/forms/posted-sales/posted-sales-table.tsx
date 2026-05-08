"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowUpDown, ArrowUp, ArrowDown, Printer, Loader2 } from "lucide-react";
import { POSTED_SALES_COLUMNS } from "./column-config";
import { PostedSalesColumnFilter } from "./column-filter";
import { PostedSalesHeader } from "@/lib/api/services/posted-sales.service";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

interface PostedSalesTableProps {
  documents: PostedSalesHeader[];
  isLoading: boolean;
  sortColumn: string | null;
  sortDirection: "asc" | "desc" | null;
  onSort: (column: string) => void;
  onRowClick: (doc: PostedSalesHeader) => void;
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  onColumnFilter: (columnId: string, value: string, valueTo?: string) => void;
  visibleColumns: string[];
  onPrint?: (doc: PostedSalesHeader) => Promise<void>;
}

export function PostedSalesTable({
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
}: PostedSalesTableProps) {
  const [printingDocNo, setPrintingDocNo] = useState<string | null>(null);
  const activeColumns = POSTED_SALES_COLUMNS.filter(c => visibleColumns.includes(c.id));

  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) return <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />;
    if (sortDirection === "asc") return <ArrowUp className="ml-2 h-3.5 w-3.5" />;
    if (sortDirection === "desc") return <ArrowDown className="ml-2 h-3.5 w-3.5" />;
    return <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />;
  };

  const formatValue = (doc: PostedSalesHeader, columnId: string) => {
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
    <div className="rounded-md border bg-card shadow-sm">
      <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
              {activeColumns.map((col) => (
                <TableHead
                  key={col.id}
                  className="h-10 px-4 py-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div 
                      className="flex items-center cursor-pointer whitespace-nowrap text-[11px] font-bold uppercase text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => onSort(col.id)}
                    >
                      {col.label}
                      {renderSortIcon(col.id)}
                    </div>
                    {col.filterType && (
                      <PostedSalesColumnFilter
                        column={col}
                        value={columnFilters[col.id]?.value || ""}
                        valueTo={columnFilters[col.id]?.valueTo || ""}
                        onChange={(val, valTo) => onColumnFilter(col.id, val, valTo)}
                      />
                    )}
                  </div>
                </TableHead>
              ))}
              {onPrint && (
                <TableHead className="h-10 px-4 py-2 text-[11px] font-bold uppercase text-muted-foreground text-center">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b last:border-0">
                  {activeColumns.map((col) => (
                    <TableCell key={col.id} className="p-4">
                      <Skeleton className="h-4 w-full opacity-50" />
                    </TableCell>
                  ))}
                  {onPrint && (
                    <TableCell className="p-4">
                      <Skeleton className="h-4 w-8 mx-auto opacity-50" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeColumns.length + (onPrint ? 1 : 0)} className="h-24 text-center text-sm text-muted-foreground italic">
                  No posted sales documents found.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow
                  key={doc.No}
                  className="cursor-pointer hover:bg-muted/30 transition-colors border-b last:border-0 group"
                  onClick={() => onRowClick(doc)}
                >
                  {activeColumns.map((col) => (
                    <TableCell key={col.id} className="p-4 whitespace-nowrap text-xs font-medium text-foreground/90 group-hover:text-foreground">
                      {formatValue(doc, col.id)}
                    </TableCell>
                  ))}
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
    </div>
  );
}
