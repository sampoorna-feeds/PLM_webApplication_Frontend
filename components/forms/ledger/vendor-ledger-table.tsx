import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import type { VendorLedgerEntry } from "@/lib/api/services/vendor-ledger.service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowUpDown, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useMemo } from "react";
import { ALL_COLUMNS, type ColumnConfig } from "./vendor-ledger-column-config";

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

const balanceColumnIds = [
  "Amount",
  "Amount_LCY",
  "Debit_Amount_LCY",
  "Credit_Amount_LCY",
  "Remaining_Amount",
  "Original_Amount",
  "Original_Amt_LCY",
  "Remaining_Amt_LCY",
  "RunningBalanceLCY",
];

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

  const activeColumns = useMemo(() => {
    // Preserve the order defined in ALL_COLUMNS, but only include visible ones
    return ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id));
  }, [visibleColumns]);

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
      rootMargin: "100px",
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

  const renderCell = (col: ColumnConfig, entry: any) => {
    const value = entry[col.id];

    switch (col.id) {
      case "Entry_No":
        return (
          <TableCell key={col.id} className="text-xs font-medium whitespace-nowrap">
            {value}
          </TableCell>
        );
      case "Posting_Date":
      case "Due_Date":
      case "Document_Date":
      case "Closed_at_Date":
      case "Invoice_Received_Date":
      case "SystemCreatedAt":
        return (
          <TableCell key={col.id} className="text-xs whitespace-nowrap">
            {value && value !== "0001-01-01" ? format(new Date(value), "PP") : "-"}
          </TableCell>
        );
      case "Document_No":
        return (
          <TableCell key={col.id} className="text-primary font-mono text-xs font-medium whitespace-nowrap">
            {value}
          </TableCell>
        );
      case "Amount":
      case "Amount_LCY":
        return (
          <TableCell
            key={col.id}
            className={cn(
              "text-right text-xs font-medium",
              (value || 0) < 0 ? "text-red-500" : (value || 0) > 0 ? "text-green-600" : ""
            )}
          >
            {(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </TableCell>
        );
      case "Debit_Amount":
      case "Credit_Amount":
      case "Remaining_Amount":
      case "Debit_Amount_LCY":
      case "Credit_Amount_LCY":
      case "Original_Amount":
      case "Original_Amt_LCY":
      case "Remaining_Amt_LCY":
      case "RunningBalanceLCY":
      case "Closed_by_Amount":
        return (
          <TableCell key={col.id} className="text-right text-xs">
            {value && value !== 0
              ? value.toLocaleString(undefined, { minimumFractionDigits: 2 })
              : "-"}
          </TableCell>
        );
      case "Open":
        return (
          <TableCell key={col.id} className="text-center">
            <Badge
              variant={value ? "outline" : "secondary"}
              className="h-5 py-0 text-[10px]"
            >
              {value ? "Open" : "Closed"}
            </Badge>
          </TableCell>
        );
      case "VendorName":
      case "Description":
        return (
          <TableCell
            key={col.id}
            className="max-w-[200px] truncate text-xs font-medium"
            title={value}
          >
            {value || "-"}
          </TableCell>
        );
      case "Reversed":
      case "GST_Reverse_Charge":
      case "GST_on_Advance_Payment":
        return (
          <TableCell key={col.id} className="text-center text-xs">
            {value ? "Yes" : "No"}
          </TableCell>
        );
      default:
        return (
          <TableCell key={col.id} className="text-xs">
            {value?.toString() || "-"}
          </TableCell>
        );
    }
  };

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

  // Calculate balance row layout
  const firstBalanceColIndex = activeColumns.findIndex((col) =>
    balanceColumnIds.includes(col.id),
  );

  const balancePrefixColSpan =
    firstBalanceColIndex === -1 ? activeColumns.length : firstBalanceColIndex;

  return (
    <div className="bg-background flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border shadow-sm">
      <div className="scrollbar-thin scrollbar-thumb-muted-foreground/20 min-h-0 flex-1 overflow-auto">
        <table className="relative min-w-full border-collapse border-spacing-0 text-sm whitespace-nowrap">
          <thead className="bg-muted sticky top-0 z-50 shadow-sm shadow-black/10">
            <tr className="border-b-0 hover:bg-transparent">
              {activeColumns.map((col) => (
                <HeaderCell
                  key={col.id}
                  field={col.id}
                  label={col.label}
                  className={cn(
                    col.width || (col.filterType === "number" ? "w-[120px] text-right" : "w-[150px]"),
                    col.id === "Entry_No" && "w-[80px]",
                    col.id === "Posting_Date" && "w-[110px]",
                    col.id === "VendorName" && "w-[180px]",
                    col.id === "Open" && "w-[80px] text-center"
                  )}
                  isSortable={col.sortable}
                />
              ))}
            </tr>
          </thead>
          <tbody className="bg-background">
            {!isOutstanding && (
              <tr className="bg-muted/10 border-b-2 font-semibold italic">
                {balancePrefixColSpan > 0 && (
                  <td
                    colSpan={balancePrefixColSpan}
                    className="text-muted-foreground px-4 py-2 text-right text-xs"
                  >
                    Opening Balance
                  </td>
                )}
                {activeColumns.slice(firstBalanceColIndex >= 0 ? firstBalanceColIndex : activeColumns.length).map((col) => {
                  if (col.id === "Amount" || col.id === "Amount_LCY") {
                    const balance = col.id === "Amount" ? openingBalance : 0; // Only showing base Amount balance for now as per original
                    return (
                      <td
                        key={`opening-${col.id}`}
                        className={cn(
                          "px-4 text-right text-xs font-bold whitespace-nowrap",
                          balance < 0 ? "text-red-500" : balance > 0 ? "text-green-600" : ""
                        )}
                      >
                        {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    );
                  }
                  return <td key={`opening-${col.id}`} className="px-4" />;
                })}
              </tr>
            )}

            {entries.length === 0 ? (
              <tr className="border-b">
                <td
                  colSpan={activeColumns.length}
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
                  {activeColumns.map((col) => renderCell(col, entry))}
                </tr>
              ))
            )}

            {/* Infinite Scroll Trigger & Loader */}
            <tr className="border-none">
              <td colSpan={activeColumns.length} className="p-0">
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
                {balancePrefixColSpan > 0 && (
                  <td
                    colSpan={balancePrefixColSpan}
                    className="text-primary bg-primary/5 px-4 py-3 text-right text-xs tracking-wider uppercase"
                  >
                    <span className="bg-[#0d0d0d] p-3 text-white">
                      Closing Balance
                    </span>
                  </td>
                )}
                {activeColumns.slice(firstBalanceColIndex >= 0 ? firstBalanceColIndex : activeColumns.length).map((col) => {
                  if (col.id === "Amount" || col.id === "Amount_LCY") {
                    const balance = col.id === "Amount" ? closingBalance : 0;
                    return (
                      <td
                        key={`closing-${col.id}`}
                        className={cn(
                          "bg-primary/5 px-4 text-right text-xs font-black whitespace-nowrap",
                          balance < 0 ? "text-red-600" : balance > 0 ? "text-green-700" : ""
                        )}
                      >
                        <span className="bg-[#0d0d0d] p-3 text-white">
                          {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    );
                  }
                  return <td key={`closing-${col.id}`} className="bg-primary/5 px-4" />;
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
