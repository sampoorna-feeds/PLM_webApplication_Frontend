"use client";

import { Card, CardContent } from "@/components/ui/card";

interface ReportLedgerSummaryProps {
  openingBalance: { qty: number; amount: number } | null;
  increaseMetrics: { qty: number; amount: number } | null;
  decreaseMetrics: { qty: number; amount: number } | null;
  closingBalance: { qty: number; amount: number } | null;
  isLoadingSummary: boolean;
}

function MetricValue({
  data,
  isLoading,
  color,
}: {
  data: { qty: number; amount: number } | null;
  isLoading: boolean;
  color?: string;
}) {
  if (isLoading)
    return <span className="animate-pulse text-xs font-semibold">...</span>;
  if (!data) return <span className="text-xs font-semibold">-</span>;

  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-xs font-semibold ${color || ""}`}>
        {data.qty.toLocaleString()}
      </span>
      <span className="text-muted-foreground text-[10px]">
        ₹{data.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}

export function ReportLedgerSummary({
  openingBalance,
  increaseMetrics,
  decreaseMetrics,
  closingBalance,
  isLoadingSummary,
}: ReportLedgerSummaryProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      <Card className="py-0">
        <CardContent className="px-3 py-1.5">
          <div className="text-muted-foreground text-[10px] font-medium uppercase">
            Opening
          </div>
          <MetricValue data={openingBalance} isLoading={isLoadingSummary} />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="px-3 py-1.5">
          <div className="text-[10px] font-medium text-green-600 uppercase">
            Incoming
          </div>
          <MetricValue
            data={increaseMetrics}
            isLoading={isLoadingSummary}
            color="text-green-600"
          />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="px-3 py-1.5">
          <div className="text-[10px] font-medium text-red-600 uppercase">
            Outgoing
          </div>
          <MetricValue
            data={decreaseMetrics}
            isLoading={isLoadingSummary}
            color="text-red-600"
          />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="px-3 py-1.5">
          <div className="text-muted-foreground text-[10px] font-medium uppercase">
            Closing
          </div>
          <MetricValue data={closingBalance} isLoading={isLoadingSummary} />
        </CardContent>
      </Card>
    </div>
  );
}
