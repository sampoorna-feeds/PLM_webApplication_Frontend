"use client";

import { useQCReceiptLines } from "./use-qc-receipts";
import { QCReceiptLinesTable } from "./qc-receipt-lines-table";
import type { QCReceiptHeader } from "@/lib/api/services/qc-receipt.service";
import { Separator } from "@/components/ui/separator";

interface QCReceiptDetailFormProps {
  tabId: string;
  formData?: any;
  context?: {
    receipt: QCReceiptHeader;
  };
}

export function QCReceiptDetailForm({ context }: QCReceiptDetailFormProps) {
  const selectedReceipt = context?.receipt;
  const { lines, isLoading: isLinesLoading } = useQCReceiptLines(selectedReceipt?.No || null);

  if (!selectedReceipt) {
    return <div className="p-4">No receipt selected</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex flex-col gap-6 p-6 pb-20">
        {/* Header Section */}
        <div>
          <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
            General Information
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
            <SummaryField label="QC Receipt No." value={selectedReceipt.No} />
            <SummaryField label="Status" value={
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                selectedReceipt.Approval_Status === "Approved" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}>
                {selectedReceipt.Approval_Status}
              </span>
            } />
            <SummaryField label="QC Date" value={formatDate(selectedReceipt.QC_Date)} />
            <SummaryField label="Receipt Date" value={formatDate(selectedReceipt.Receipt_Date)} />
            <SummaryField label="PO No." value={selectedReceipt.Purchase_Order_No} />
            <SummaryField label="Location" value={selectedReceipt.Location_Code} />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Item & Vendor Details
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
            <SummaryField label="Item No." value={selectedReceipt.Item_No} />
            <SummaryField label="Item Name" value={selectedReceipt.Item_Name} />
            <SummaryField label="Vendor Name" value={selectedReceipt.Buy_from_Vendor_Name} />
            <SummaryField label="Vehicle No." value={selectedReceipt.Vehicle_No} />
            <SummaryField label="Inspection Qty" value={`${selectedReceipt.Inspection_Quantity.toLocaleString()} ${selectedReceipt.Unit_of_Measure}`} />
          </div>
        </div>

        <Separator />

        {/* Lines Section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
              Line Items
            </h2>
          </div>
          <div className="min-h-0">
             <QCReceiptLinesTable lines={lines} isLoading={isLinesLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: any }) {
  if (value === undefined || value === null || value === "") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">-</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{label}</span>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr || dateStr === "0001-01-01") return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}
