"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQCReceiptLines, useQCReceiptPosting, useQCReceiptUpdate } from "./use-qc-receipts";
import { QCReceiptLinesTable } from "./qc-receipt-lines-table";
import type { QCReceiptHeader, QCReceiptLine } from "@/lib/api/services/qc-receipt.service";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Loader2, Send, Save, RotateCcw } from "lucide-react";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";

interface QCReceiptDetailFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function QCReceiptDetailForm({ tabId, context }: QCReceiptDetailFormProps) {
  const { closeTab } = useFormStackContext();
  const initialReceipt = context?.receipt as QCReceiptHeader | undefined;
  const isPosted = !!context?.isPosted;
  
  const [receipt, setReceipt] = useState<QCReceiptHeader | null>(initialReceipt || null);
  const [editedFields, setEditedFields] = useState<Partial<QCReceiptHeader>>({});
  
  const { lines, setLines, isLoading: isLinesLoading } = useQCReceiptLines(
    receipt?.No || null,
    isPosted
  );
  const { postReceipt, isPosting } = useQCReceiptPosting();
  const { updateHeader, isUpdating: isHeaderUpdating } = useQCReceiptUpdate();

  useEffect(() => {
    if (initialReceipt) setReceipt(initialReceipt);
  }, [initialReceipt]);

  if (!receipt) {
    return <div className="p-4">No receipt selected</div>;
  }

  const handleFieldChange = (field: keyof QCReceiptHeader, value: any) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
    setReceipt(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleResetHeader = () => {
    setReceipt(initialReceipt || null);
    setEditedFields({});
  };

  const handleSaveHeader = async () => {
    if (!receipt || Object.keys(editedFields).length === 0) return;
    
    const result = await updateHeader(receipt.No, receipt["@odata.etag"] || "*", editedFields);
    if (result) {
      setReceipt(result);
      setEditedFields({});
    }
  };

  const handlePost = async () => {
    if (!receipt) return;
    const success = await postReceipt(receipt, lines);
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

  const isHeaderDirty = Object.keys(editedFields).length > 0;

  const formatQty = (val?: number) => {
    if (val === undefined || val === null) return "-";
    return val.toLocaleString();
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex flex-col gap-8 p-6 pb-20">
        {/* ACTION BAR */}
        <div className="flex items-center justify-between border-b pb-4 sticky top-0 bg-background/95 backdrop-blur-sm z-20">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{receipt.No}</h1>
            <p className="text-xs text-muted-foreground uppercase font-semibold">
              {receipt.Item_Name} • {receipt.Buy_from_Vendor_Name}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             {isHeaderDirty && (
               <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetHeader}
                  disabled={isHeaderUpdating}
                  className="gap-2 h-8"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveHeader}
                  disabled={isHeaderUpdating}
                  className="gap-2 h-8 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                >
                  {isHeaderUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Header Changes
                </Button>
               </>
             )}

             <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                receipt.Approval_Status === "Approved" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}>
                {receipt.Approval_Status}
              </div>

            {!isPosted && (
              <Button
                size="sm"
                onClick={handlePost}
                disabled={
                  isPosting ||
                  isLinesLoading ||
                  isHeaderDirty ||
                  receipt.Approval_Status !== "Approved"
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
          <SectionContainer title="">
             <SummaryField label="No." value={receipt.No} />
             <SummaryField label="Item No." value={receipt.Item_No} />
             <SummaryField label="Vehicle No." value={receipt.Vehicle_No} />
             <SummaryField label="Item Code" value={receipt.Item_No} />
             <SummaryField label="Item Name" value={receipt.Item_Name} />
             <SummaryField label="Unit Of Measure" value={receipt.Unit_of_Measure} />
             <SummaryField label="Receipt Date" value={formatDate(receipt.Receipt_Date)} />
             <SummaryField label="Location Code" value={receipt.Location_Code} />
          </SectionContainer>

          <div className="rounded-xl border bg-muted/20 p-6 shadow-sm">
            <SectionContainer title="">
               <EditFormField 
                 label="QC Date" 
                 isReadOnly={isPosted}
               >
                 <DateInput 
                   value={receipt.QC_Date} 
                   onChange={(val) => handleFieldChange("QC_Date", val)}
                   disabled={isPosted}
                 />
               </EditFormField>

               <EditFormField label="Inspection QTY" isReadOnly={isPosted}>
                 <Input 
                   type="number" 
                   value={receipt.Inspection_Quantity} 
                   onChange={(e) => handleFieldChange("Inspection_Quantity", Number(e.target.value))}
                   disabled={isPosted}
                 />
               </EditFormField>

               <EditFormField label="Quantity to Accpt" isReadOnly={isPosted}>
                 <Input 
                   type="number" 
                   value={receipt.Quantity_to_Accept} 
                   onChange={(e) => handleFieldChange("Quantity_to_Accept", Number(e.target.value))}
                   disabled={isPosted}
                 />
               </EditFormField>

               <EditFormField label="Qty Accept (Dev.)" isReadOnly={isPosted}>
                 <Input 
                   type="number" 
                   value={receipt.Qty_to_Accept_with_Deviation} 
                   onChange={(e) => handleFieldChange("Qty_to_Accept_with_Deviation", Number(e.target.value))}
                   disabled={isPosted}
                 />
               </EditFormField>

               <EditFormField label="Quantity to reject" isReadOnly={isPosted}>
                 <Input 
                   type="number" 
                   value={receipt.Quantity_to_Reject} 
                   onChange={(e) => handleFieldChange("Quantity_to_Reject", Number(e.target.value))}
                   disabled={isPosted}
                 />
               </EditFormField>

               <div className="flex flex-col gap-4 mt-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="approve" 
                      checked={receipt.Approve} 
                      onCheckedChange={(val) => handleFieldChange("Approve", val)}
                      disabled={isPosted}
                    />
                    <Label htmlFor="approve" className="text-[10px] uppercase font-bold text-muted-foreground/60">Approve</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="accepted-with-approval" 
                      checked={receipt.Accepted_With_Approval} 
                      onCheckedChange={(val) => handleFieldChange("Accepted_With_Approval", val)}
                      disabled={isPosted}
                    />
                    <Label htmlFor="accepted-with-approval" className="text-[10px] uppercase font-bold text-muted-foreground/60">Accepted w/ Approval</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="create-bardana" 
                      checked={receipt.Create_Bardana} 
                      onCheckedChange={(val) => handleFieldChange("Create_Bardana", val)}
                      disabled={isPosted}
                    />
                    <Label htmlFor="create-bardana" className="text-[10px] uppercase font-bold text-muted-foreground/60">Create Bardana</Label>
                  </div>
               </div>

               <EditFormField label="Rebate %" isReadOnly={isPosted}>
                 <Input 
                   type="number" 
                   value={receipt.Rabete_Percent} 
                   onChange={(e) => handleFieldChange("Rabete_Percent", Number(e.target.value))}
                   disabled={isPosted || !receipt.Accepted_With_Approval}
                 />
               </EditFormField>

               <EditFormField label="Store Location Code" isReadOnly={isPosted}>
                 <Input 
                   value={receipt.Store_Location_Code || ""} 
                   onChange={(e) => handleFieldChange("Store_Location_Code", e.target.value)}
                   disabled={isPosted}
                 />
               </EditFormField>

               <div className="md:col-span-2 lg:col-span-3">
                 <EditFormField label="Comments" isReadOnly={isPosted}>
                   <Textarea 
                     value={receipt.Comment || ""} 
                     onChange={(e) => handleFieldChange("Comment", e.target.value)}
                     disabled={isPosted}
                     className="min-h-[80px]"
                   />
                 </EditFormField>
               </div>
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

function EditFormField({ 
  label, 
  children, 
  isReadOnly 
}: { 
  label: string; 
  children: React.ReactNode; 
  isReadOnly?: boolean 
}) {
  return (
    <div className="flex flex-col gap-1.5 overflow-hidden">
      <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">{label}</Label>
      <div className="min-h-10">
        {children}
      </div>
    </div>
  );
}

function SectionContainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      {title && (
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 border-b border-muted py-2 flex items-center justify-between">
          {title}
        </h2>
      )}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
