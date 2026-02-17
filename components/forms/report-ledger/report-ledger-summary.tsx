"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ItemWiseStock } from "@/lib/api/services/inventory.service";

interface ReportLedgerSummaryProps {
  currentStock: ItemWiseStock | null;
  openingBalance: { qty: number; amount: number } | null;
  increaseMetrics: { qty: number; amount: number } | null;
  decreaseMetrics: { qty: number; amount: number } | null;
  closingBalance: { qty: number; amount: number } | null;
  isLoadingStock: boolean;
  isLoadingSummary: boolean;
  selectedItem?: { label: string; value: string };
  selectedLocation?: { label: string; value: string };
  dateRange?: { from: Date | undefined; to: Date | undefined };
}

export function ReportLedgerSummary({
  currentStock,
  openingBalance,
  increaseMetrics,
  decreaseMetrics,
  closingBalance,
  isLoadingStock,
  isLoadingSummary,
}: ReportLedgerSummaryProps) {
  return (
    <div className="mb-2">
      {/* 5 Metric Cards - Ultra Compact Grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {/* Opening Balance */}
        <Card>
          <CardHeader className="p-2 pb-1">
            <CardTitle className="text-xs font-medium">Opening</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {isLoadingSummary ? (
              <div className="animate-pulse text-sm font-bold">...</div>
            ) : openingBalance ? (
              <div className="space-y-0">
                <div className="text-sm font-bold">
                  {openingBalance.qty.toLocaleString()}
                </div>
                <div className="text-muted-foreground text-xs">
                  ₹
                  {openingBalance.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm font-bold">-</div>
            )}
          </CardContent>
        </Card>

        {/* Increase Metrics */}
        <Card>
          <CardHeader className="p-2 pb-1">
            <CardTitle className="text-xs font-medium text-green-600">
              Increase
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {isLoadingSummary ? (
              <div className="animate-pulse text-sm font-bold">...</div>
            ) : increaseMetrics ? (
              <div className="space-y-0">
                <div className="text-sm font-bold text-green-600">
                  {increaseMetrics.qty.toLocaleString()}
                </div>
                <div className="text-muted-foreground text-xs">
                  ₹
                  {increaseMetrics.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm font-bold">-</div>
            )}
          </CardContent>
        </Card>

        {/* Decrease Metrics */}
        <Card>
          <CardHeader className="p-2 pb-1">
            <CardTitle className="text-xs font-medium text-red-600">
              Decrease
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {isLoadingSummary ? (
              <div className="animate-pulse text-sm font-bold">...</div>
            ) : decreaseMetrics ? (
              <div className="space-y-0">
                <div className="text-sm font-bold text-red-600">
                  {decreaseMetrics.qty.toLocaleString()}
                </div>
                <div className="text-muted-foreground text-xs">
                  ₹
                  {decreaseMetrics.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm font-bold">-</div>
            )}
          </CardContent>
        </Card>

        {/* Closing Balance */}
        <Card>
          <CardHeader className="p-2 pb-1">
            <CardTitle className="text-xs font-medium">Closing</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {isLoadingSummary ? (
              <div className="animate-pulse text-sm font-bold">...</div>
            ) : closingBalance ? (
              <div className="space-y-0">
                <div className="text-sm font-bold">
                  {closingBalance.qty.toLocaleString()}
                </div>
                <div className="text-muted-foreground text-xs">
                  ₹
                  {closingBalance.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm font-bold">-</div>
            )}
          </CardContent>
        </Card>

        {/* Current Stock */}
        <Card>
          <CardHeader className="p-2 pb-1">
            <CardTitle className="text-xs font-medium">Current</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {isLoadingStock ? (
              <div className="animate-pulse text-sm font-bold">...</div>
            ) : currentStock ? (
              <div className="space-y-0">
                <div className="text-sm font-bold">
                  {(currentStock.Quantity ?? 0).toLocaleString()}
                </div>
                <div className="text-muted-foreground text-xs">
                  ₹
                  {(currentStock.CostAmount ?? 0).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm font-bold">0</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
