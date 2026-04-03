import React, { useRef, useEffect, useCallback } from "react";
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
import { Loader2 } from "lucide-react";
import type { VendorLedgerEntry } from "@/lib/api/services/vendor-ledger.service";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";

interface VendorLedgerTableProps {
  entries: VendorLedgerEntry[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasMore: boolean;
  loadMore: () => void;
  openingBalance: number;
  closingBalance: number;
  onSort: (field: string) => void;
  onColumnFilterChange: (field: string, value: string) => void;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  columnFilters?: Record<string, string>;
  visibleColumns: string[];
  isOutstanding?: boolean;
}

export function VendorLedgerTable({
  entries,
  isLoading,
  isFetchingNextPage,
  hasMore,
  loadMore,
  openingBalance,
  closingBalance,
  onSort,
  onColumnFilterChange,
  sortField,
  sortOrder,
  columnFilters = {},
  visibleColumns,
  isOutstanding = false,
}: VendorLedgerTableProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isFetchingNextPage && !isLoading) {
        loadMore();
      }
    },
    [hasMore, isFetchingNextPage, isLoading, loadMore]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: "100px", // Load more when 100px from bottom
    });

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [handleObserver]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-2 h-3.5 w-3.5 text-primary" />
    ) : (
      <ChevronDown className="ml-2 h-3.5 w-3.5 text-primary" />
    );
  };

  const HeaderCell = ({ 
    field, 
    label, 
    className,
    isSortable = true,
  }: { 
    field: string; 
    label: string; 
    className?: string;
    isSortable?: boolean;
  }) => (
    <th className={cn("px-4 py-4 z-40 bg-muted transition-colors border-b shadow-sm text-left align-middle font-medium whitespace-nowrap", className)}>
      <div 
        className={cn(
          "flex items-center cursor-pointer hover:text-primary transition-colors gap-2",
          !isSortable && "cursor-default hover:text-inherit"
        )}
        onClick={() => isSortable && onSort(field)}
      >
        <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">{label}</span>
        {isSortable && <SortIcon field={field} />}
      </div>
    </th>
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

  return (
    <div className="border rounded-md overflow-hidden bg-background shadow-sm flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
        <table className="relative min-w-full border-collapse border-spacing-0 whitespace-nowrap text-sm">
          <thead className="sticky top-0 z-50 bg-muted shadow-sm shadow-black/10">
            <tr className="hover:bg-transparent border-b-0">
              {visibleColumns.includes("Entry_No") && <HeaderCell field="Entry_No" label="Entry No." className="w-[100px]" />}
              {visibleColumns.includes("Posting_Date") && <HeaderCell field="Posting_Date" label="Posting Date" className="w-[120px]" />}
              {visibleColumns.includes("Document_Type") && <HeaderCell field="Document_Type" label="Doc Type" className="w-[120px]" />}
              {visibleColumns.includes("Document_No") && <HeaderCell field="Document_No" label="Doc No." className="w-[150px]" />}
              {visibleColumns.includes("External_Document_No") && <HeaderCell field="External_Document_No" label="Ext. Doc No." className="w-[150px]" />}
              {visibleColumns.includes("VendorName") && <HeaderCell field="VendorName" label="Vendor Name" className="w-[200px]" />}
              {visibleColumns.includes("Debit_Amount") && <HeaderCell field="Debit_Amount" label="Debit" className="w-[120px] text-right" />}
              {visibleColumns.includes("Credit_Amount") && <HeaderCell field="Credit_Amount" label="Credit" className="w-[120px] text-right" />}
              {visibleColumns.includes("Amount") && <HeaderCell field="Amount" label="Amount" className="w-[120px] text-right" />}
              {visibleColumns.includes("Amount_LCY") && <HeaderCell field="Amount_LCY" label="Amount (LCY)" className="w-[120px] text-right" />}
              {visibleColumns.includes("Debit_Amount_LCY") && <HeaderCell field="Debit_Amount_LCY" label="Debit (LCY)" className="w-[120px] text-right" />}
              {visibleColumns.includes("Credit_Amount_LCY") && <HeaderCell field="Credit_Amount_LCY" label="Credit (LCY)" className="w-[120px] text-right" />}
              {visibleColumns.includes("Remaining_Amount") && <HeaderCell field="Remaining_Amount" label="Remaining" className="w-[120px] text-right" />}
              {visibleColumns.includes("Global_Dimension_1_Code") && <HeaderCell field="Global_Dimension_1_Code" label="Dim 1" className="w-[100px]" />}
              {visibleColumns.includes("Global_Dimension_2_Code") && <HeaderCell field="Global_Dimension_2_Code" label="Dim 2" className="w-[100px]" />}
              {visibleColumns.includes("TDS_Section_Code") && <HeaderCell field="TDS_Section_Code" label="TDS" className="w-[100px]" />}
              {visibleColumns.includes("Open") && <HeaderCell field="Open" label="Status" className="w-[100px] text-center" />}
              {visibleColumns.includes("Due_Date") && <HeaderCell field="Due_Date" label="Due Date" className="w-[120px]" />}
              {visibleColumns.includes("Description") && <HeaderCell field="Description" label="Description" className="w-[200px]" />}
              {visibleColumns.includes("Document_Date") && <HeaderCell field="Document_Date" label="Doc Date" className="w-[120px]" />}
              {visibleColumns.includes("Closed_at_Date") && <HeaderCell field="Closed_at_Date" label="Closed Date" className="w-[120px]" />}
              {visibleColumns.includes("Vendor_No") && <HeaderCell field="Vendor_No" label="Vendor No" className="w-[100px]" />}
              {visibleColumns.includes("Invoice_Received_Date") && <HeaderCell field="Invoice_Received_Date" label="Inv. Rec. Date" className="w-[130px]" />}
            </tr>
          </thead>
          <tbody className="bg-background">
            {!isOutstanding && (
              <tr className="bg-muted/10 font-semibold italic border-b-2">
                <td 
                  colSpan={visibleColumns.filter(c => !["Amount", "Amount_LCY", "Debit_Amount_LCY", "Credit_Amount_LCY", "Remaining_Amount"].includes(c)).length} 
                  className="text-right text-xs py-2 px-4 text-muted-foreground"
                >
                  Opening Balance
                </td>
                {visibleColumns.includes("Amount") && (
                  <td className={cn(
                    "text-right text-xs font-bold px-4 whitespace-nowrap",
                    openingBalance < 0 ? "text-red-500" : openingBalance > 0 ? "text-green-600" : ""
                  )}>
                    {openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                )}
                {visibleColumns.includes("Amount_LCY") && <td className="px-4" />}
                {visibleColumns.includes("Debit_Amount_LCY") && <td className="px-4" />}
                {visibleColumns.includes("Credit_Amount_LCY") && <td className="px-4" />}
                {visibleColumns.includes("Remaining_Amount") && <td className="px-4" />}
                <td colSpan={visibleColumns.filter(c => !["Entry_No", "Posting_Date", "Document_Type", "Document_No", "External_Document_No", "VendorName", "Debit_Amount", "Credit_Amount", "Amount", "Amount_LCY", "Debit_Amount_LCY", "Credit_Amount_LCY", "Remaining_Amount"].includes(c)).length + (visibleColumns.includes("Amount") ? 0 : 1)} className="px-4" />
              </tr>
            )}

            {entries.length === 0 ? (
               <tr className="border-b">
                <td colSpan={visibleColumns.length} className="h-24 text-center text-muted-foreground italic px-4">
                  No transaction history found for the selected period.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id || entry.Entry_No} className="hover:bg-muted/30 transition-colors border-b">
                  {visibleColumns.includes("Entry_No") && <TableCell className="font-medium text-xs whitespace-nowrap">{entry.Entry_No}</TableCell>}
                  {visibleColumns.includes("Posting_Date") && (
                    <TableCell className="text-xs whitespace-nowrap">
                      {entry.Posting_Date && entry.Posting_Date !== "0001-01-01" 
                        ? format(new Date(entry.Posting_Date), "PP") 
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Document_Type") && <TableCell className="text-xs">{entry.Document_Type || "Journal"}</TableCell>}
                  {visibleColumns.includes("Document_No") && (
                    <TableCell className="text-xs font-mono font-medium text-primary whitespace-nowrap">
                      {entry.Document_No}
                    </TableCell>
                  )}
                  {visibleColumns.includes("External_Document_No") && (
                    <TableCell className="text-xs max-w-[120px] truncate" title={entry.External_Document_No}>
                      {entry.External_Document_No || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("VendorName") && (
                    <TableCell className="text-xs font-medium max-w-[180px] truncate" title={entry.VendorName}>
                      {entry.VendorName}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Debit_Amount") && (
                    <TableCell className="text-right text-xs">
                      {entry.Debit_Amount !== 0 ? entry.Debit_Amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Credit_Amount") && (
                    <TableCell className="text-right text-xs">
                      {entry.Credit_Amount !== 0 ? entry.Credit_Amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Amount") && (
                    <TableCell className={cn(
                      "text-right text-xs font-medium",
                      entry.Amount < 0 ? "text-red-500" : "text-green-600"
                    )}>
                      {entry.Amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Amount_LCY") && (
                    <TableCell className={cn(
                      "text-right text-xs",
                      entry.Amount_LCY < 0 ? "text-red-500" : "text-green-600"
                    )}>
                      {entry.Amount_LCY?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Debit_Amount_LCY") && (
                    <TableCell className="text-right text-xs">
                      {entry.Debit_Amount_LCY !== 0 ? entry.Debit_Amount_LCY?.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Credit_Amount_LCY") && (
                    <TableCell className="text-right text-xs">
                      {entry.Credit_Amount_LCY !== 0 ? entry.Credit_Amount_LCY?.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Remaining_Amount") && (
                    <TableCell className="text-right text-xs font-semibold text-primary">
                      {entry.Remaining_Amount !== 0 
                        ? entry.Remaining_Amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) 
                        : "0.00"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Global_Dimension_1_Code") && <TableCell className="text-xs uppercase font-medium">{entry.Global_Dimension_1_Code}</TableCell>}
                  {visibleColumns.includes("Global_Dimension_2_Code") && <TableCell className="text-xs uppercase font-medium">{entry.Global_Dimension_2_Code}</TableCell>}
                  {visibleColumns.includes("TDS_Section_Code") && <TableCell className="text-xs font-mono">{entry.TDS_Section_Code || "-"}</TableCell>}
                  {visibleColumns.includes("Open") && (
                    <TableCell className="text-center">
                      <Badge variant={entry.Open ? "outline" : "secondary"} className="text-[10px] h-5 py-0">
                        {entry.Open ? "Open" : "Closed"}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes("Due_Date") && (
                    <TableCell className="text-xs whitespace-nowrap">
                      {entry.Due_Date && entry.Due_Date !== "0001-01-01" 
                        ? format(new Date(entry.Due_Date), "PP") 
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Description") && (
                    <TableCell className="text-xs max-w-[200px] truncate" title={entry.Description}>
                      {entry.Description || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Document_Date") && (
                    <TableCell className="text-xs whitespace-nowrap">
                      {entry.Document_Date && entry.Document_Date !== "0001-01-01" 
                        ? format(new Date(entry.Document_Date), "PP") 
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Closed_at_Date") && (
                    <TableCell className="text-xs whitespace-nowrap">
                      {entry.Closed_at_Date && entry.Closed_at_Date !== "0001-01-01" 
                        ? format(new Date(entry.Closed_at_Date), "PP") 
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Vendor_No") && <TableCell className="text-xs">{entry.Vendor_No}</TableCell>}
                  {visibleColumns.includes("Invoice_Received_Date") && (
                    <TableCell className="text-xs whitespace-nowrap">
                      {entry.Invoice_Received_Date && entry.Invoice_Received_Date !== "0001-01-01" 
                        ? format(new Date(entry.Invoice_Received_Date), "PP") 
                        : "-"}
                    </TableCell>
                  )}
                </tr>
              ))
            )}

            {/* Infinite Scroll Trigger & Loader */}
            <tr className="border-none">
              <td colSpan={visibleColumns.length} className="p-0">
                <div ref={observerTarget} className="h-4 w-full" />
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4 bg-muted/5">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground font-medium">Loading more entries...</span>
                  </div>
                )}
              </td>
            </tr>

            {!isOutstanding && (
              <tr className="bg-primary/5 font-bold border-t-2 sticky bottom-0 z-40 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                <td 
                  colSpan={visibleColumns.filter(c => !["Amount", "Amount_LCY", "Debit_Amount_LCY", "Credit_Amount_LCY", "Remaining_Amount"].includes(c)).length} 
                  className="text-right text-xs py-3 px-4 text-primary uppercase tracking-wider bg-primary/5"
                >
                  Closing Balance
                </td>
                {visibleColumns.includes("Amount") && (
                  <td className={cn(
                    "text-right text-xs font-black px-4 whitespace-nowrap bg-primary/5",
                    closingBalance < 0 ? "text-red-600" : "text-green-700"
                  )}>
                    {closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                )}
                {visibleColumns.includes("Amount_LCY") && <td className="px-4 bg-primary/5" />}
                {visibleColumns.includes("Debit_Amount_LCY") && <td className="px-4 bg-primary/5" />}
                {visibleColumns.includes("Credit_Amount_LCY") && <td className="px-4 bg-primary/5" />}
                {visibleColumns.includes("Remaining_Amount") && <td className="px-4 bg-primary/5" />}
                <td colSpan={visibleColumns.filter(c => !["Entry_No", "Posting_Date", "Document_Type", "Document_No", "External_Document_No", "VendorName", "Debit_Amount", "Credit_Amount", "Amount", "Amount_LCY", "Debit_Amount_LCY", "Credit_Amount_LCY", "Remaining_Amount"].includes(c)).length + (visibleColumns.includes("Amount") ? 0 : 1)} className="px-4 bg-primary/5" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

