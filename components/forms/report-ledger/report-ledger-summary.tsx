"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ItemWiseStock } from "@/lib/api/services/inventory.service";

interface ReportLedgerSummaryProps {
  currentStock: ItemWiseStock | null;
  openingBalance: number | null;
  closingBalance: number | null;
  isLoadingStock: boolean;
  isLoadingSummary: boolean;
  selectedItem?: { label: string; value: string };
  selectedLocation?: { label: string; value: string };
  dateRange?: { from: Date | undefined; to: Date | undefined };
}

export function ReportLedgerSummary({
  currentStock,
  openingBalance,
  closingBalance,
  isLoadingStock,
  isLoadingSummary,
  selectedItem,
  selectedLocation,
  dateRange,
}: ReportLedgerSummaryProps) {
  if (!selectedItem || !selectedLocation) {
    return null;
  }

  return (
    <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Current Stock Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Current Physical Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoadingStock ? (
              <span className="animate-pulse">...</span>
            ) : currentStock ? (
              (currentStock.Quantity ?? 0).toLocaleString()
            ) : (
              "0"
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {selectedLocation.label}
          </p>
        </CardContent>
      </Card>

      {/* Opening Balance Card (Conditional on Date) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoadingSummary ? (
              <span className="animate-pulse">...</span>
            ) : openingBalance !== null ? (
              openingBalance.toLocaleString()
            ) : (
              "-"
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {dateRange?.from
              ? `Before ${dateRange.from.toLocaleDateString()}`
              : "All time"}
          </p>
        </CardContent>
      </Card>

      {/* Closing Balance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Closing Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoadingSummary ? (
              <span className="animate-pulse">...</span>
            ) : closingBalance !== null ? (
              closingBalance.toLocaleString()
            ) : (
              "-"
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {dateRange?.to
              ? `As of ${dateRange.to.toLocaleDateString()}`
              : "Current calculations"}
          </p>
        </CardContent>
      </Card>

      {/* Item Details Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Selected Item</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="truncate text-sm font-bold"
            title={selectedItem.label}
          >
            {selectedItem.label.split("-")[0]}
          </div>
          <p
            className="text-muted-foreground truncate text-xs"
            title={selectedItem.label}
          >
            {selectedItem.label.split("-").slice(1).join("-")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
