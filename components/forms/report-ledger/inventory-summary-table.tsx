"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import type { SummaryRow, SummaryGroup } from "./use-inventory-summary";

interface InventorySummaryTableProps {
  allRows: SummaryRow[];
  grouped: SummaryGroup[];
  paginatedRows: SummaryRow[];
  isLoading: boolean;
  loadingMessage: string;
  dateFrom: string;
  dateTo: string;
}

/** Format number with locale and 2 decimal places */
function fmtNum(val: number): string {
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format date for column headers: "As of DD/MM/YY" */
function fmtDateHeader(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `As of ${d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })}`;
  } catch {
    return dateStr;
  }
}

/**
 * Determine which groups a page of rows belongs to, preserving group headers
 * in the flat paginated list.
 */
function paginatedWithGroups(
  paginatedRows: SummaryRow[],
  allRows: SummaryRow[],
): { type: "group"; name: string }[] | SummaryRow[] {
  // Build flat display list with group headers inserted
  return paginatedRows;
}

export function InventorySummaryTable({
  allRows,
  grouped,
  paginatedRows,
  isLoading,
  loadingMessage,
  dateFrom,
  dateTo,
}: InventorySummaryTableProps) {
  // Build a display list: group headers + rows for the current page
  const displayItems = useMemo(() => {
    const items: (
      | { type: "header"; groupName: string }
      | { type: "row"; row: SummaryRow }
    )[] = [];
    let currentGroup = "";

    for (const row of paginatedRows) {
      if (row.inventoryPostingGroup !== currentGroup) {
        currentGroup = row.inventoryPostingGroup;
        items.push({ type: "header", groupName: currentGroup });
      }
      items.push({ type: "row", row });
    }

    return items;
  }, [paginatedRows]);

  const TOTAL_COLUMNS = 12; // itemNo + description + uom + 2*opening + 2*increases + 2*decreases + 2*closing + costGL

  return (
    <div className="bg-card flex h-full flex-1 flex-col overflow-hidden rounded-lg border">
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          {/* Multi-row header matching the screenshot layout */}
          <thead className="bg-muted sticky top-0 z-10">
            {/* Top header row: grouped column labels */}
            <tr className="border-b">
              <th
                rowSpan={2}
                className="text-foreground h-10 min-w-[80px] px-3 py-2 text-left align-middle text-xs font-bold whitespace-nowrap"
              >
                Item No.
              </th>
              <th
                rowSpan={2}
                className="text-foreground h-10 min-w-[200px] px-3 py-2 text-left align-middle text-xs font-bold whitespace-nowrap"
              >
                Description
              </th>
              <th
                rowSpan={2}
                className="text-foreground h-10 min-w-[60px] px-3 py-2 text-center align-middle text-xs font-bold whitespace-nowrap"
              >
                Base UoM
              </th>
              <th
                colSpan={2}
                className="text-foreground h-10 border-l px-3 py-2 text-center align-middle text-xs font-bold whitespace-nowrap"
              >
                {dateFrom ? fmtDateHeader(dateFrom) : "Opening"}
              </th>
              <th
                colSpan={2}
                className="text-foreground h-10 border-l px-3 py-2 text-center align-middle text-xs font-bold whitespace-nowrap"
              >
                Increases (LCY)
              </th>
              <th
                colSpan={2}
                className="text-foreground h-10 border-l px-3 py-2 text-center align-middle text-xs font-bold whitespace-nowrap"
              >
                Decreases (LCY)
              </th>
              <th
                colSpan={2}
                className="text-foreground h-10 border-l px-3 py-2 text-center align-middle text-xs font-bold whitespace-nowrap"
              >
                {dateTo ? fmtDateHeader(dateTo) : "Closing"}
              </th>
              <th
                rowSpan={2}
                className="text-foreground h-10 min-w-[100px] border-l px-3 py-2 text-right align-middle text-xs font-bold whitespace-nowrap"
              >
                Cost Posted to G/L
              </th>
            </tr>
            {/* Sub header row: Quantity / Value for each pair */}
            <tr className="border-b">
              <th className="text-foreground h-8 min-w-[90px] border-l px-3 py-1 text-right align-middle text-xs font-semibold whitespace-nowrap">
                Quantity
              </th>
              <th className="text-foreground h-8 min-w-[100px] px-3 py-1 text-right align-middle text-xs font-semibold whitespace-nowrap">
                Value
              </th>
              <th className="text-foreground h-8 min-w-[90px] border-l px-3 py-1 text-right align-middle text-xs font-semibold whitespace-nowrap">
                Quantity
              </th>
              <th className="text-foreground h-8 min-w-[100px] px-3 py-1 text-right align-middle text-xs font-semibold whitespace-nowrap">
                Value
              </th>
              <th className="text-foreground h-8 min-w-[90px] border-l px-3 py-1 text-right align-middle text-xs font-semibold whitespace-nowrap">
                Quantity
              </th>
              <th className="text-foreground h-8 min-w-[100px] px-3 py-1 text-right align-middle text-xs font-semibold whitespace-nowrap">
                Value
              </th>
              <th className="text-foreground h-8 min-w-[90px] border-l px-3 py-1 text-right align-middle text-xs font-semibold whitespace-nowrap">
                Quantity
              </th>
              <th className="text-foreground h-8 min-w-[100px] px-3 py-1 text-right align-middle text-xs font-semibold whitespace-nowrap">
                Value
              </th>
            </tr>
          </thead>

          <tbody className="[&_tr:last-child]:border-0">
            {/* Loading state */}
            {isLoading && (
              <>
                {/* Loading indicator row */}
                <tr className="border-b">
                  <td
                    colSpan={TOTAL_COLUMNS}
                    className="h-16 text-center align-middle"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground text-sm">
                        {loadingMessage || "Loading..."}
                      </span>
                    </div>
                  </td>
                </tr>
                {/* Skeleton rows */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b">
                    {Array.from({ length: TOTAL_COLUMNS }).map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {/* Empty state */}
            {!isLoading && allRows.length === 0 && (
              <tr className="border-b">
                <td
                  colSpan={TOTAL_COLUMNS}
                  className="text-muted-foreground h-24 text-center align-middle"
                >
                  No inventory summary data found. Apply filters to generate the
                  report.
                </td>
              </tr>
            )}

            {/* Data rows with group headers */}
            {!isLoading &&
              displayItems.map((item, idx) => {
                if (item.type === "header") {
                  return (
                    <tr
                      key={`group-${item.groupName}`}
                      className="bg-muted/50 border-b"
                    >
                      <td
                        colSpan={TOTAL_COLUMNS}
                        className="px-3 py-2 text-xs font-bold tracking-wide uppercase"
                      >
                        {item.groupName}
                      </td>
                    </tr>
                  );
                }

                const row = item.row;
                return (
                  <tr
                    key={row.itemNo}
                    className="hover:bg-muted/30 border-b transition-colors"
                  >
                    <td className="px-3 py-2 text-xs font-medium whitespace-nowrap">
                      {row.itemNo}
                    </td>
                    <td className="max-w-[250px] truncate px-3 py-2 text-xs whitespace-nowrap">
                      {row.description}
                    </td>
                    <td className="px-3 py-2 text-center text-xs whitespace-nowrap">
                      {row.baseUoM}
                    </td>
                    {/* Opening */}
                    <td className="border-l px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                      {fmtNum(row.openingQty)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                      {fmtNum(row.openingValue)}
                    </td>
                    {/* Increases */}
                    <td className="border-l px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                      {fmtNum(row.increasesQty)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                      {fmtNum(row.increasesValue)}
                    </td>
                    {/* Decreases */}
                    <td className="border-l px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                      {fmtNum(row.decreasesQty)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                      {fmtNum(row.decreasesValue)}
                    </td>
                    {/* Closing */}
                    <td className="border-l px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                      {fmtNum(row.closingQty)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                      {fmtNum(row.closingValue)}
                    </td>
                    {/* Cost Posted to G/L */}
                    <td className="text-muted-foreground border-l px-3 py-2 text-right text-xs whitespace-nowrap">
                      {row.costPostedToGL}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
