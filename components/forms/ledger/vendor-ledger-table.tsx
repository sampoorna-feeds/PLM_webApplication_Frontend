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

interface VendorLedgerTableProps {
  entries: VendorLedgerEntry[];
  isLoading: boolean;
}

export function VendorLedgerTable({ entries, isLoading }: VendorLedgerTableProps) {
  if (isLoading && entries.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center border rounded-md">
        <span className="text-sm text-muted-foreground animate-pulse">Loading data...</span>
      </div>
    );
  }

  if (!isLoading && entries.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center border rounded-md">
        <span className="text-sm text-muted-foreground italic">No entries found for the current filters.</span>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden bg-background shadow-sm">
      <div className="overflow-x-auto max-h-[600px]">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[100px] whitespace-nowrap">Entry No.</TableHead>
              <TableHead className="w-[100px] whitespace-nowrap">Posting Date</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Document Type</TableHead>
              <TableHead className="w-[150px] whitespace-nowrap">Document No.</TableHead>
              <TableHead className="w-[150px] whitespace-nowrap">Ext. Doc No.</TableHead>
              <TableHead className="w-[200px] whitespace-nowrap">Vendor Name</TableHead>
              <TableHead className="w-[120px] text-right whitespace-nowrap">Debit Amount</TableHead>
              <TableHead className="w-[120px] text-right whitespace-nowrap">Credit Amount</TableHead>
              <TableHead className="w-[120px] text-right whitespace-nowrap">Amount</TableHead>
              <TableHead className="w-[120px] text-right whitespace-nowrap">Remaining</TableHead>
              <TableHead className="w-[100px] text-center whitespace-nowrap">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.Entry_No} className="hover:bg-muted/30 transition-colors">
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
