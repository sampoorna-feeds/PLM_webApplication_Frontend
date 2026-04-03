import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import type { VendorLedgerEntry } from "@/lib/api/services/vendor-ledger.service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowUpDown, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

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
      if (
        target.isIntersecting &&
        hasMore &&
        !isFetchingNextPage &&
        !isLoading
      ) {
        loadMore();
      }
    },
    [hasMore, isFetchingNextPage, isLoading, loadMore],
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
    if (sortField !== field)
      return <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="text-primary ml-2 h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="text-primary ml-2 h-3.5 w-3.5" />
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
    <th
      className={cn(
        "bg-muted z-40 border-b px-4 py-4 text-left align-middle font-medium whitespace-nowrap shadow-sm transition-colors",
        className,
      )}
    >
      <div
        className={cn(
          "hover:text-primary flex cursor-pointer items-center gap-2 transition-colors",
          !isSortable && "cursor-default hover:text-inherit",
        )}
        onClick={() => isSortable && onSort(field)}
      >
        <span className="text-muted-foreground text-xs font-bold tracking-wider whitespace-nowrap uppercase">
          {label}
        </span>
        {isSortable && <SortIcon field={field} />}
      </div>
    </th>
  );

  if (isLoading && entries.length === 0) {
    return (
      <div className="bg-muted/5 flex h-64 items-center justify-center rounded-md border">
        <div className="flex flex-col items-center gap-2">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <span className="text-muted-foreground text-sm font-medium">
            Fetching ledger data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border shadow-sm">
      <div className="scrollbar-thin scrollbar-thumb-muted-foreground/20 min-h-0 flex-1 overflow-auto">
        <table className="relative min-w-full border-collapse border-spacing-0 text-sm whitespace-nowrap">
          <thead className="bg-muted sticky top-0 z-50 shadow-sm shadow-black/10">
            <tr className="border-b-0 hover:bg-transparent">
              {visibleColumns.includes("Entry_No") && (
                <HeaderCell
                  field="Entry_No"
                  label="Entry No."
                  className="w-[100px]"
                />
              )}
              {visibleColumns.includes("Posting_Date") && (
                <HeaderCell
                  field="Posting_Date"
                  label="Posting Date"
                  className="w-[120px]"
                />
              )}
              {visibleColumns.includes("Document_Type") && (
                <HeaderCell
                  field="Document_Type"
                  label="Doc Type"
                  className="w-[120px]"
                />
              )}
              {visibleColumns.includes("Document_No") && (
                <HeaderCell
                  field="Document_No"
                  label="Doc No."
                  className="w-[150px]"
                />
              )}
              {visibleColumns.includes("External_Document_No") && (
                <HeaderCell
                  field="External_Document_No"
                  label="Ext. Doc No."
                  className="w-[150px]"
                />
              )}
              {visibleColumns.includes("VendorName") && (
                <HeaderCell
                  field="VendorName"
                  label="Vendor Name"
                  className="w-[200px]"
                />
              )}
              {visibleColumns.includes("Debit_Amount") && (
                <HeaderCell
                  field="Debit_Amount"
                  label="Debit"
                  className="w-[120px] text-right"
                />
              )}
              {visibleColumns.includes("Credit_Amount") && (
                <HeaderCell
                  field="Credit_Amount"
                  label="Credit"
                  className="w-[120px] text-right"
                />
              )}
              {visibleColumns.includes("Amount") && (
                <HeaderCell
                  field="Amount"
                  label="Amount"
                  className="w-[120px] text-right"
                />
              )}
              {visibleColumns.includes("Amount_LCY") && (
                <HeaderCell
                  field="Amount_LCY"
                  label="Amount (LCY)"
                  className="w-[120px] text-right"
                />
              )}
              {visibleColumns.includes("Debit_Amount_LCY") && (
                <HeaderCell
                  field="Debit_Amount_LCY"
                  label="Debit (LCY)"
                  className="w-[120px] text-right"
                />
              )}
              {visibleColumns.includes("Credit_Amount_LCY") && (
                <HeaderCell
                  field="Credit_Amount_LCY"
                  label="Credit (LCY)"
                  className="w-[120px] text-right"
                />
              )}
              {visibleColumns.includes("Remaining_Amount") && (
                <HeaderCell
                  field="Remaining_Amount"
                  label="Remaining"
                  className="w-[120px] text-right"
                />
              )}
              {visibleColumns.includes("Global_Dimension_1_Code") && (
                <HeaderCell
                  field="Global_Dimension_1_Code"
                  label="Dim 1"
                  className="w-[100px]"
                />
              )}
              {visibleColumns.includes("Global_Dimension_2_Code") && (
                <HeaderCell
                  field="Global_Dimension_2_Code"
                  label="Dim 2"
                  className="w-[100px]"
                />
              )}
              {visibleColumns.includes("TDS_Section_Code") && (
                <HeaderCell
                  field="TDS_Section_Code"
                  label="TDS"
                  className="w-[100px]"
                />
              )}
              {visibleColumns.includes("Open") && (
                <HeaderCell
                  field="Open"
                  label="Status"
                  className="w-[100px] text-center"
                />
              )}
              {visibleColumns.includes("Due_Date") && (
                <HeaderCell
                  field="Due_Date"
                  label="Due Date"
                  className="w-[120px]"
                />
              )}
              {visibleColumns.includes("Description") && (
                <HeaderCell
                  field="Description"
                  label="Description"
                  className="w-[200px]"
                />
              )}
              {visibleColumns.includes("Document_Date") && (
                <HeaderCell
                  field="Document_Date"
                  label="Doc Date"
                  className="w-[120px]"
                />
              )}
              {visibleColumns.includes("Closed_at_Date") && (
                <HeaderCell
                  field="Closed_at_Date"
                  label="Closed Date"
                  className="w-[120px]"
                />
              )}
              {visibleColumns.includes("Vendor_No") && (
                <HeaderCell
                  field="Vendor_No"
                  label="Vendor No"
                  className="w-[100px]"
                />
              )}
              {visibleColumns.includes("Invoice_Received_Date") && (
                <HeaderCell
                  field="Invoice_Received_Date"
                  label="Inv. Rec. Date"
                  className="w-[130px]"
                />
              )}
            </tr>
          </thead>
          <tbody className="bg-background">
            {!isOutstanding && (
              <tr className="bg-muted/10 border-b-2 font-semibold italic">
                <td
                  colSpan={
                    visibleColumns.filter(
                      (c) =>
                        ![
                          "Amount",
                          "Amount_LCY",
                          "Debit_Amount_LCY",
                          "Credit_Amount_LCY",
                          "Remaining_Amount",
                        ].includes(c),
                    ).length
                  }
                  className="text-muted-foreground px-4 py-2 text-right text-xs"
                >
                  Opening Balance
                </td>
                {visibleColumns.includes("Amount") && (
                  <td
                    className={cn(
                      "px-4 text-right text-xs font-bold whitespace-nowrap",
                      openingBalance < 0
                        ? "text-red-500"
                        : openingBalance > 0
                          ? "text-green-600"
                          : "",
                    )}
                  >
                    {openingBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                )}
                {visibleColumns.includes("Amount_LCY") && (
                  <td className="px-4" />
                )}
                {visibleColumns.includes("Debit_Amount_LCY") && (
                  <td className="px-4" />
                )}
                {visibleColumns.includes("Credit_Amount_LCY") && (
                  <td className="px-4" />
                )}
                {visibleColumns.includes("Remaining_Amount") && (
                  <td className="px-4" />
                )}
                <td
                  colSpan={
                    visibleColumns.filter(
                      (c) =>
                        ![
                          "Entry_No",
                          "Posting_Date",
                          "Document_Type",
                          "Document_No",
                          "External_Document_No",
                          "VendorName",
                          "Debit_Amount",
                          "Credit_Amount",
                          "Amount",
                          "Amount_LCY",
                          "Debit_Amount_LCY",
                          "Credit_Amount_LCY",
                          "Remaining_Amount",
                        ].includes(c),
                    ).length + (visibleColumns.includes("Amount") ? 0 : 1)
                  }
                  className="px-4"
                />
              </tr>
            )}

            {entries.length === 0 ? (
              <tr className="border-b">
                <td
                  colSpan={visibleColumns.length}
                  className="text-muted-foreground h-24 px-4 text-center italic"
                >
                  No transaction history found for the selected period.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id || entry.Entry_No}
                  className="hover:bg-muted/30 border-b transition-colors"
                >
                  {visibleColumns.includes("Entry_No") && (
                    <TableCell className="text-xs font-medium whitespace-nowrap">
                      {entry.Entry_No}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Posting_Date") && (
                    <TableCell className="text-xs whitespace-nowrap">
                      {entry.Posting_Date && entry.Posting_Date !== "0001-01-01"
                        ? format(new Date(entry.Posting_Date), "PP")
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Document_Type") && (
                    <TableCell className="text-xs">
                      {entry.Document_Type || "Journal"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Document_No") && (
                    <TableCell className="text-primary font-mono text-xs font-medium whitespace-nowrap">
                      {entry.Document_No}
                    </TableCell>
                  )}
                  {visibleColumns.includes("External_Document_No") && (
                    <TableCell
                      className="max-w-[120px] truncate text-xs"
                      title={entry.External_Document_No}
                    >
                      {entry.External_Document_No || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("VendorName") && (
                    <TableCell
                      className="max-w-[180px] truncate text-xs font-medium"
                      title={entry.VendorName}
                    >
                      {entry.VendorName}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Debit_Amount") && (
                    <TableCell className="text-right text-xs">
                      {entry.Debit_Amount !== 0
                        ? entry.Debit_Amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Credit_Amount") && (
                    <TableCell className="text-right text-xs">
                      {entry.Credit_Amount !== 0
                        ? entry.Credit_Amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Amount") && (
                    <TableCell
                      className={cn(
                        "text-right text-xs font-medium",
                        entry.Amount < 0 ? "text-red-500" : "text-green-600",
                      )}
                    >
                      {entry.Amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Amount_LCY") && (
                    <TableCell
                      className={cn(
                        "text-right text-xs",
                        entry.Amount_LCY < 0
                          ? "text-red-500"
                          : "text-green-600",
                      )}
                    >
                      {entry.Amount_LCY?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      }) || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Debit_Amount_LCY") && (
                    <TableCell className="text-right text-xs">
                      {entry.Debit_Amount_LCY !== 0
                        ? entry.Debit_Amount_LCY?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Credit_Amount_LCY") && (
                    <TableCell className="text-right text-xs">
                      {entry.Credit_Amount_LCY !== 0
                        ? entry.Credit_Amount_LCY?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Remaining_Amount") && (
                    <TableCell className="text-primary text-right text-xs font-semibold">
                      {entry.Remaining_Amount !== 0
                        ? entry.Remaining_Amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })
                        : "0.00"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Global_Dimension_1_Code") && (
                    <TableCell className="text-xs font-medium uppercase">
                      {entry.Global_Dimension_1_Code}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Global_Dimension_2_Code") && (
                    <TableCell className="text-xs font-medium uppercase">
                      {entry.Global_Dimension_2_Code}
                    </TableCell>
                  )}
                  {visibleColumns.includes("TDS_Section_Code") && (
                    <TableCell className="font-mono text-xs">
                      {entry.TDS_Section_Code || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Open") && (
                    <TableCell className="text-center">
                      <Badge
                        variant={entry.Open ? "outline" : "secondary"}
                        className="h-5 py-0 text-[10px]"
                      >
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
                    <TableCell
                      className="max-w-[200px] truncate text-xs"
                      title={entry.Description}
                    >
                      {entry.Description || "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Document_Date") && (
                    <TableCell className="text-xs whitespace-nowrap">
                      {entry.Document_Date &&
                      entry.Document_Date !== "0001-01-01"
                        ? format(new Date(entry.Document_Date), "PP")
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Closed_at_Date") && (
                    <TableCell className="text-xs whitespace-nowrap">
                      {entry.Closed_at_Date &&
                      entry.Closed_at_Date !== "0001-01-01"
                        ? format(new Date(entry.Closed_at_Date), "PP")
                        : "-"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Vendor_No") && (
                    <TableCell className="text-xs">{entry.Vendor_No}</TableCell>
                  )}
                  {visibleColumns.includes("Invoice_Received_Date") && (
                    <TableCell className="text-xs whitespace-nowrap">
                      {entry.Invoice_Received_Date &&
                      entry.Invoice_Received_Date !== "0001-01-01"
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
                  <div className="bg-muted/5 flex items-center justify-center py-4">
                    <Loader2 className="text-primary h-6 w-6 animate-spin" />
                    <span className="text-muted-foreground ml-2 text-sm font-medium">
                      Loading more entries...
                    </span>
                  </div>
                )}
              </td>
            </tr>

            {!isOutstanding && (
              <tr className="sticky bottom-0 z-40 border-t-2 bg-[#0d0d0d]/90 font-bold shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                <td
                  colSpan={
                    visibleColumns.filter(
                      (c) =>
                        ![
                          "Amount",
                          "Amount_LCY",
                          "Debit_Amount_LCY",
                          "Credit_Amount_LCY",
                          "Remaining_Amount",
                        ].includes(c),
                    ).length
                  }
                  className="text-primary bg-primary/5 px-4 py-3 text-right text-xs tracking-wider uppercase"
                >
                  <span className="bg-[#0d0d0d] p-3 text-white">
                    Closing Balance
                  </span>
                </td>
                {visibleColumns.includes("Amount") && (
                  <td
                    className={cn(
                      "bg-primary/5 px-4 text-right text-xs font-black whitespace-nowrap",
                      closingBalance < 0 ? "text-red-600" : "text-green-700",
                    )}
                  >
                    <span className="bg-[#0d0d0d] p-3 text-white">
                      {closingBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </td>
                )}
                {visibleColumns.includes("Amount_LCY") && (
                  <td className="bg-primary/5 px-4" />
                )}
                {visibleColumns.includes("Debit_Amount_LCY") && (
                  <td className="bg-primary/5 px-4" />
                )}
                {visibleColumns.includes("Credit_Amount_LCY") && (
                  <td className="bg-primary/5 px-4" />
                )}
                {visibleColumns.includes("Remaining_Amount") && (
                  <td className="bg-primary/5 px-4" />
                )}
                <td
                  colSpan={
                    visibleColumns.filter(
                      (c) =>
                        ![
                          "Entry_No",
                          "Posting_Date",
                          "Document_Type",
                          "Document_No",
                          "External_Document_No",
                          "VendorName",
                          "Debit_Amount",
                          "Credit_Amount",
                          "Amount",
                          "Amount_LCY",
                          "Debit_Amount_LCY",
                          "Credit_Amount_LCY",
                          "Remaining_Amount",
                        ].includes(c),
                    ).length + (visibleColumns.includes("Amount") ? 0 : 1)
                  }
                  className="bg-primary/5 px-4"
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
