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
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { type PostedSalesHeader } from "@/lib/api/services/posted-sales.service";
import { format } from "date-fns";

interface PostedSalesTableProps {
  documents: PostedSalesHeader[];
  isLoading: boolean;
  sortColumn: string | null;
  sortDirection: "asc" | "desc" | null;
  onSort: (column: string) => void;
  onRowClick: (doc: PostedSalesHeader) => void;
}

export function PostedSalesTable({
  documents,
  isLoading,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
}: PostedSalesTableProps) {
  const columns = [
    { id: "No", label: "No." },
    { id: "Sell_to_Customer_No", label: "Customer No." },
    { id: "Sell_to_Customer_Name", label: "Customer Name" },
    { id: "Posting_Date", label: "Posting Date" },
    { id: "Document_Date", label: "Doc. Date" },
    { id: "Location_Code", label: "Location" },
  ];

  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    if (sortDirection === "asc") return <ArrowUp className="ml-2 h-4 w-4" />;
    if (sortDirection === "desc") return <ArrowDown className="ml-2 h-4 w-4" />;
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
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
          ) : documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No posted sales documents found.
              </TableCell>
            </TableRow>
          ) : (
            documents.map((doc) => (
              <TableRow
                key={doc.No}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onRowClick(doc)}
              >
                {columns.map((col) => (
                  <TableCell key={col.id} className="whitespace-nowrap text-xs font-medium">
                    {formatValue(doc, col.id)}
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
