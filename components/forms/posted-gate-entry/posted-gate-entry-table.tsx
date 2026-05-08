"use client";

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
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { type PostedGateEntryHeader } from "@/lib/api/services/posted-gate-entry.service";
import { type SortDirection } from "./column-config";
import { format } from "date-fns";

interface PostedGateEntryTableProps {
  entries: PostedGateEntryHeader[];
  isLoading: boolean;
  visibleColumns: string[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
  onRowClick: (entry: PostedGateEntryHeader) => void;
}

export function PostedGateEntryTable({
  entries,
  isLoading,
  visibleColumns,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
}: PostedGateEntryTableProps) {
  const columns = [
    { id: "No", label: "No." },
    { id: "Document_Date", label: "Date" },
    { id: "Vehicle_No", label: "Vehicle No." },
    { id: "Transporter_Name", label: "Transporter" },
    { id: "Description", label: "Description" },
    { id: "Location_Code", label: "Location" },
  ].filter((col) => visibleColumns.includes(col.id));

  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    if (sortDirection === "asc") return <ArrowUp className="ml-2 h-4 w-4" />;
    if (sortDirection === "desc") return <ArrowDown className="ml-2 h-4 w-4" />;
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
  };

  const formatValue = (entry: PostedGateEntryHeader, columnId: string) => {
    const value = entry[columnId];
    if (value === null || value === undefined) return "-";
    if (columnId === "Document_Date") {
      try {
        return format(new Date(value as string), "dd/MM/yyyy");
      } catch {
        return value as string;
      }
    }
    return String(value);
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((col) => (
              <TableHead
                key={col.id}
                className="cursor-pointer whitespace-nowrap text-xs font-bold uppercase text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => onSort(col.id)}
              >
                <div className="flex items-center">
                  {col.label}
                  {renderSortIcon(col.id)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.id}>
                    <Skeleton className="h-4 w-full" />
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
            entries.map((entry) => (
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
