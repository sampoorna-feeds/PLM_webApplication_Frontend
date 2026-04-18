"use client";

import { useQCReceiptLines, useQCReceiptPosting } from "./use-qc-receipts";
import { QCReceiptLinesTable } from "./qc-receipt-lines-table";
import type { QCReceiptHeader, QCReceiptLine } from "@/lib/api/services/qc-receipt.service";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";

interface QCReceiptDetailFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function QCReceiptDetailForm({ tabId, context }: QCReceiptDetailFormProps) {
  const { closeTab } = useFormStackContext();
  const selectedReceipt = context?.receipt as QCReceiptHeader | undefined;
  const isPosted = !!context?.isPosted;
  
  const { lines, setLines, isLoading: isLinesLoading } = useQCReceiptLines(
    selectedReceipt?.No || null,
    isPosted
  );
  const { postReceipt, isPosting } = useQCReceiptPosting();

  if (!selectedReceipt) {
    return <div className="p-4">No receipt selected</div>;
  }

  const handlePost = async () => {
    if (!selectedReceipt) return;
    const success = await postReceipt(selectedReceipt, lines);
    if (success) {
      closeTab(tabId);
    }
  };

  const handleLineUpdate = (index: number, updatedLine: QCReceiptLine) => {
    setLines(prev => {
      const newLines = [...prev];
      newLines[index] = updatedLine;
      return newLines;
    });
  };

  const formatQty = (val?: number) => {
    if (val === undefined || val === null) return "-";
    return val.toLocaleString();
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex flex-col gap-8 p-6 pb-20">
        {/* ACTION BAR */}
        <div className="flex items-center justify-between border-b pb-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{selectedReceipt.No}</h1>
            <p className="text-xs text-muted-foreground uppercase font-semibold">
              {selectedReceipt.Item_Name} • {selectedReceipt.Buy_from_Vendor_Name}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                selectedReceipt.Approval_Status === "Approved" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}>
                {selectedReceipt.Approval_Status}
              </div>

            {!isPosted && (
              <Button
                size="sm"
                onClick={handlePost}
                disabled={
                  isPosting ||
                  isLinesLoading ||
                  selectedReceipt.Approval_Status !== "Approved"
                }
                className="gap-2 h-8"
              >
                {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Post QC Receipt
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-10">
          {/* SECTION: GENERAL & STATUS */}
          <SectionContainer title="General & Status">
             <SummaryField label="QC Receipt No." value={selectedReceipt.No} />
             <SummaryField label="QC Date" value={formatDate(selectedReceipt.QC_Date)} />
             <SummaryField label="Receipt Date" value={formatDate(selectedReceipt.Receipt_Date)} />
             <SummaryField label="Checked By" value={selectedReceipt.Checked_By} />
             <SummaryField label="Approved By" value={selectedReceipt.Approved_By} />
             <SummaryField label="Approval Status" value={selectedReceipt.Approval_Status} />
             <SummaryField label="Comment" value={selectedReceipt.Comment} />
             <SummaryField label="Sample QC" value={selectedReceipt.Sample_QC ? "Yes" : "No"} />
             <SummaryField label="Create Bardana" value={selectedReceipt.Create_Bardana ? "Yes" : "No"} />
             <SummaryField label="Approve" value={selectedReceipt.Approve ? "Yes" : "No"} />
             <SummaryField label="Accepted w/ Approval" value={selectedReceipt.Accepted_With_Approval ? "Yes" : "No"} />
          </SectionContainer>

          {/* SECTION: ITEM DETAILS */}
          <SectionContainer title="Item Details">
            <SummaryField label="Item No." value={selectedReceipt.Item_No} />
            <SummaryField label="Item Name" value={selectedReceipt.Item_Name} />
            <SummaryField label="Item Description" value={selectedReceipt.Item_Description} />
            <SummaryField label="UOM" value={selectedReceipt.Unit_of_Measure} />
            <SummaryField label="Item Tracking" value={selectedReceipt.Item_Tracking} />
            <SummaryField label="Sample Quantity" value={formatQty(selectedReceipt.Sample_Quantity)} />
            <SummaryField label="Remaining Qty" value={formatQty(selectedReceipt.Remaining_Quantity)} />
            <SummaryField label="No. of Container" value={formatQty(selectedReceipt.No_of_Container)} />
            <SummaryField label="Mfg Date" value={formatDate(selectedReceipt.Mfg_Date)} />
            <SummaryField label="Exp Date" value={formatDate(selectedReceipt.Exp_Date)} />
            <SummaryField label="Rebate %" value={selectedReceipt.Rabete_Percent} />
          </SectionContainer>

          {/* SECTION: VENDOR & ORDER */}
          <SectionContainer title="Vendor & Order info">
            <SummaryField label="Vendor No." value={selectedReceipt.Buy_from_Vendor_No} />
            <SummaryField label="Vendor Name" value={selectedReceipt.Buy_from_Vendor_Name} />
            <SummaryField label="Vehicle No." value={selectedReceipt.Vehicle_No} />
            <SummaryField label="PO No." value={selectedReceipt.Purchase_Order_No} />
            <SummaryField label="Purchase Receipt No." value={selectedReceipt.Purchase_Receipt_No} />
            <SummaryField label="Order Date" value={formatDate(selectedReceipt.Order_Date)} />
            <SummaryField label="Vendor Shipment No." value={selectedReceipt.Vendor_Shipment_No} />
            <SummaryField label="Vendor Lot No." value={selectedReceipt.Vendor_Lot_No} />
            <SummaryField label="Party Type" value={selectedReceipt.Party_Type} />
            <SummaryField label="Party No." value={selectedReceipt.Party_No} />
            <SummaryField label="Party Name" value={selectedReceipt.Party_Name} />
            <SummaryField label="Address" value={selectedReceipt.Address} />
            <SummaryField label="Phone No." value={selectedReceipt.Phone_no} />
          </SectionContainer>

          {/* SECTION: CUSTOMER DETAILS */}
          <SectionContainer title="Customer Details">
            <SummaryField label="Customer No." value={selectedReceipt.Sell_to_Customer_No} />
            <SummaryField label="Customer Name" value={selectedReceipt.Sell_to_Customer_Name} />
          </SectionContainer>

          {/* SECTION: QUANTITIES */}
          <SectionContainer title="Quantities">
            <SummaryField label="Inspection Qty" value={`${formatQty(selectedReceipt.Inspection_Quantity)} ${selectedReceipt.Unit_of_Measure}`} />
            <SummaryField label="Qty to Accept" value={`${formatQty(selectedReceipt.Quantity_to_Accept)} ${selectedReceipt.Unit_of_Measure}`} />
            <SummaryField label="Qty Accept (Dev.)" value={`${formatQty(selectedReceipt.Qty_to_Accept_with_Deviation)} ${selectedReceipt.Unit_of_Measure}`} />
            <SummaryField label="Qty to Reject" value={`${formatQty(selectedReceipt.Quantity_to_Reject)} ${selectedReceipt.Unit_of_Measure}`} />
            <SummaryField label="Qty to Rework" value={`${formatQty(selectedReceipt.Quantity_to_Rework)} ${selectedReceipt.Unit_of_Measure}`} />
            <SummaryField label="Total Accepted" value={`${formatQty(selectedReceipt.Total_Accepted_Quantity)} ${selectedReceipt.Unit_of_Measure}`} />
            <SummaryField label="Total Under Dev." value={`${formatQty(selectedReceipt.Total_Under_Deviation_Acc_Qty)} ${selectedReceipt.Unit_of_Measure}`} />
            <SummaryField label="Total Rejected" value={`${formatQty(selectedReceipt.Total_Rejected_Quantity)} ${selectedReceipt.Unit_of_Measure}`} />
          </SectionContainer>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
            {/* SECTION: DOCUMENT & JOURNAL */}
            <SectionContainer title="Document & Journal">
               <SummaryField label="Document Type" value={selectedReceipt.Document_Type} />
               <SummaryField label="Document No." value={selectedReceipt.Document_No} />
               <SummaryField label="Document Line No." value={selectedReceipt.Document_Line_No} />
               <SummaryField label="Journal Template" value={selectedReceipt.Item_Journal_Template_Name} />
               <SummaryField label="Journal Batch" value={selectedReceipt.Item_General_Batch_Name} />
               <SummaryField label="Journal Line No." value={selectedReceipt.Item_Journal_Line_No} />
            </SectionContainer>

             {/* SECTION: LOCATION & STORAGE */}
             <SectionContainer title="Location & Storage">
              <SummaryField label="Location Code" value={selectedReceipt.Location_Code} />
              <SummaryField label="QC Location" value={selectedReceipt.QC_Location} />
              <SummaryField label="QC Bin Code" value={selectedReceipt.QC_Bin_Code} />
              <SummaryField label="Store Location" value={selectedReceipt.Store_Location_Code} />
              <SummaryField label="Store Bin Code" value={selectedReceipt.Store_Bin_Code} />
              <SummaryField label="Rejection Location" value={selectedReceipt.Rejection_Location} />
              <SummaryField label="Reject Bin Code" value={selectedReceipt.Reject_Bin_Code} />
              <SummaryField label="Rework Location" value={selectedReceipt.Rework_Location} />
              <SummaryField label="Rework Bin Code" value={selectedReceipt.Rework_Bin_Code} />
              <SummaryField label="Center No." value={selectedReceipt.Center_No} />
              <SummaryField label="Center Type" value={selectedReceipt.Center_Type} />
              <SummaryField label="Operation No." value={selectedReceipt.Operation_No} />
              <SummaryField label="Operation Name" value={selectedReceipt.Operation_Name} />
            </SectionContainer>
          </div>
        </div>


        <Separator />

        {/* Lines Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-1">
            <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
              Line Items
            </h2>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
               {lines.length} parameters found
            </div>
          </div>
          <div className="min-h-0">
             <QCReceiptLinesTable 
               lines={lines} 
               isLoading={isLinesLoading} 
               onUpdate={handleLineUpdate}
               isReadOnly={isPosted}
             />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionContainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-muted py-1 flex items-center justify-between">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {children}
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: any }) {
  const isValueEmpty = value === undefined || value === null || value === "" || value === " ";
  
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">{label}</span>
      <div className={`text-sm font-medium ${isValueEmpty ? 'text-muted-foreground/30 italic' : 'text-foreground'}`}>
        {isValueEmpty ? '-' : (typeof value === 'number' ? value.toLocaleString() : value)}
      </div>
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
