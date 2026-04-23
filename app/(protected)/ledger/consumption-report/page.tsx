"use client";

import { ConsumptionReportForm } from "@/components/forms/ledger-reports/consumption-report-form";

export default function ConsumptionReportPage() {
  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full overflow-y-auto px-4 py-6">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Ledger Reports</h1>
          <p className="text-muted-foreground text-sm">
            Generate and manage your consumption reports
          </p>
        </div>
        <ConsumptionReportForm />
      </div>
    </div>
  );
}
