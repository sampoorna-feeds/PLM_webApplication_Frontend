"use client";

import React from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { VendorLedgerEntry } from "@/lib/api/services/vendor-ledger.service";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface VendorLedgerTableProps {
  entries: VendorLedgerEntry[];
  isLoading: boolean;
  openingBalance: number;
  closingBalance: number;
  onSort: (field: string) => void;
  onColumnFilterChange: (field: string, value: string) => void;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  columnFilters?: Record<string, string>;
}

export function VendorLedgerTable({
  entries,
  isLoading,
  openingBalance,
  closingBalance,
  onSort,
  onColumnFilterChange,
  sortField,
  sortOrder,
  columnFilters = {},
}: VendorLedgerTableProps) {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-2 h-3.5 w-3.5 text-primary" />
    ) : (
      <ChevronDown className="ml-2 h-3.5 w-3.5 text-primary" />
    );
  };

  const FilterInput = ({ field, placeholder }: { field: string; placeholder: string }) => (
    <div className="relative mt-1">
      <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={columnFilters[field] || ""}
        onChange={(e) => onColumnFilterChange(field, e.target.value)}
        className="h-7 w-full pl-7 pr-2 text-[10px] focus-visible:ring-1"
      />
    </div>
  );

  const HeaderCell = ({ 
    field, 
    label, 
    className,
    isSortable = true,
    isFilterable = true
  }: { 
    field: string; 
    label: string; 
    className?: string;
    isSortable?: boolean;
    isFilterable?: boolean;
  }) => (
    <TableHead className={cn("px-2 py-1", className)}>
      <div 
        className={cn(
          "flex items-center cursor-pointer hover:text-primary transition-colors",
          !isSortable && "cursor-default hover:text-inherit"
        )}
        onClick={() => isSortable && onSort(field)}
      >
        <span className="font-semibold text-xs">{label}</span>
        {isSortable && <SortIcon field={field} />}
      </div>
      {isFilterable && <FilterInput field={field} placeholder={`Filter ${label}...`} />}
    </TableHead>
  );

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center border rounded-md bg-muted/5">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm font-medium text-muted-foreground">Fetching ledger data...</span>
        </div>
      </div>
    );
  }

  // If no entries and not loading, we still want to see the "Opening Balance" if available? 
  // Actually, if entries is 0, let's just show no entries found unless opening/closing are non-zero.

  return (
    <div className="border rounded-md overflow-hidden bg-background shadow-sm">
      <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-muted-foreground/20">
        <Table className="relative">
          <TableHeader className="bg-muted/50 sticky top-0 z-20 shadow-sm border-b">
            <TableRow className="hover:bg-transparent border-b-0">
              <HeaderCell field="Entry_No" label="Entry No." className="w-[100px]" />
              <HeaderCell field="Posting_Date" label="Posting Date" className="w-[120px]" />
              <HeaderCell field="Document_Type" label="Doc Type" className="w-[120px]" />
              <HeaderCell field="Document_No" label="Doc No." className="w-[150px]" />
              <HeaderCell field="External_Document_No" label="Ext. Doc No." className="w-[150px]" />
              <HeaderCell field="VendorName" label="Vendor Name" className="w-[200px]" />
              <HeaderCell field="Debit_Amount" label="Debit" className="w-[120px] text-right" />
              <HeaderCell field="Credit_Amount" label="Credit" className="w-[120px] text-right" />
              <HeaderCell field="Amount" label="Amount" className="w-[120px] text-right" />
              <HeaderCell field="Remaining_Amount" label="Remaining" className="w-[120px] text-right" />
              <HeaderCell field="Open" label="Status" className="w-[100px] text-center" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Opening Balance Row */}
            <TableRow className="bg-muted/10 font-semibold italic border-b-2">
              <TableCell colSpan={8} className="text-right text-xs py-2 text-muted-foreground highlight">
                Opening Balance
              </TableCell>
              <TableCell className={cn(
                "text-right text-xs font-bold",
                openingBalance < 0 ? "text-red-500" : openingBalance > 0 ? "text-green-600" : ""
              )}>
                {openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>

            {entries.length === 0 ? (
               <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground italic">
                  No transaction history found for the selected period.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.Entry_No} className="hover:bg-muted/30 transition-colors border-b">
                  <TableCell className="font-medium text-xs whitespace-nowrap">{entry.Entry_No}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {entry.Posting_Date && entry.Posting_Date !== "0001-01-01" 
                      ? format(new Date(entry.Posting_Date), "PP") 
                      : "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {entry.Document_Type || "Journal"}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-medium text-primary whitespace-nowrap">
                    {entry.Document_No}
                  </TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate" title={entry.External_Document_No}>
                    {entry.External_Document_No || "-"}
                  </TableCell>
                  <TableCell className="text-xs font-medium max-w-[180px] truncate" title={entry.VendorName}>
                    {entry.VendorName}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {entry.Debit_Amount !== 0 ? entry.Debit_Amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {entry.Credit_Amount !== 0 ? entry.Credit_Amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right text-xs font-medium",
                    entry.Amount < 0 ? "text-red-500" : "text-green-600"
                  )}>
                    {entry.Amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold text-primary">
                    {entry.Remaining_Amount !== 0 
                      ? entry.Remaining_Amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) 
                      : "0.00"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={entry.Open ? "outline" : "secondary"} className="text-[10px] h-5 py-0">
                      {entry.Open ? "Open" : "Closed"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}

            {/* Closing Balance Row */}
            <TableRow className="bg-primary/5 font-bold border-t-2">
              <TableCell colSpan={8} className="text-right text-xs py-3 text-primary uppercase tracking-wider">
                Closing Balance
              </TableCell>
              <TableCell className={cn(
                "text-right text-xs font-black",
                closingBalance < 0 ? "text-red-600" : "text-green-700"
              )}>
                {closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

