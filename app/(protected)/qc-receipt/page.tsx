"use client";

import {
  FormStackProvider,
} from "@/components/form-stack";
import { QCReceiptView } from "@/components/forms/qc-receipt/qc-receipt-view";

export default function QCReceiptPage() {

  return (
    <FormStackProvider formScope="qc-receipt">
      <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-col px-4 pt-4">
            <h1 className="text-2xl font-semibold tracking-tight">
              QC Receipt
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage and track quality control receipts
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
            <div className="flex-1 mt-0 h-full">
              <QCReceiptView skipDateFilter={true} />
            </div>
          </div>
        </div>
      </div>
    </FormStackProvider>
  );
}
