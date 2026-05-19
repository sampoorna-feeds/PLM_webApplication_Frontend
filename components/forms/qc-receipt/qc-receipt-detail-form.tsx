"use client";

import { LocationSelect } from "@/components/forms/shared/location-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { CalculatorInput } from "@/components/ui/calculator-input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { getDimensionValueName, getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";
import type { QCReceiptHeader, QCReceiptLine } from "@/lib/api/services/qc-receipt.service";
import { getTransferAllLocationCodes, type TransferLocationCode } from "@/lib/api/services/transfer-orders.service";
import { getAuthCredentials } from "@/lib/auth/storage";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { Loader2, RotateCcw, Save, Send, Trash2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { QCReceiptLinesTable } from "./qc-receipt-lines-table";
import { useQCReceiptDetail, useQCReceiptLines, useQCReceiptPosting, useQCReceiptUpdate, useQCReceiptDeletion, useQCReceiptBardana } from "./use-qc-receipts";
import { formatDate } from "@/lib/utils/date";

interface QCReceiptDetailFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function QCReceiptDetailForm({ tabId, context }: QCReceiptDetailFormProps) {
  const { closeTab } = useFormStackContext();
  const initialReceipt = context?.receipt as QCReceiptHeader | undefined;
  const isPosted = !!context?.isPosted;
  
  const { receipt, setReceipt, isLoading: isHeaderLoading, refetch: refetchDetail } = useQCReceiptDetail(
    initialReceipt?.No || null,
    isPosted
  );
  const [editedFields, setEditedFields] = useState<Partial<QCReceiptHeader>>({});
  
  const { lines, setLines, isLoading: isLinesLoading } = useQCReceiptLines(
    receipt?.No || null,
    isPosted
  );
  const { postReceipt, isPosting } = useQCReceiptPosting();
  const { updateHeader, isUpdating: isHeaderUpdating } = useQCReceiptUpdate();
  const { deleteReceipt, isDeleting } = useQCReceiptDeletion();
  const { generate: generateBardana, isGenerating } = useQCReceiptBardana();
  
  const [locations, setLocations] = useState<TransferLocationCode[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [userBranch, setUserBranch] = useState<string | undefined>(undefined);
  const [showConfirmPost, setShowConfirmPost] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    const creds = getAuthCredentials();
    if (creds?.userID) {
      getAllBranchesFromUserSetup(creds.userID).then(branches => {
        if (branches.length > 0) setUserBranch(branches[0].Code);
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    const loadLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const locs = await getTransferAllLocationCodes();
        let finalLocs = [...locs];
        
        // Ensure both Location_Code and Store_Location_Code are in the locations list
        const missingCodes = [receipt?.Location_Code, receipt?.Store_Location_Code]
          .filter((code): code is string => !!code && !finalLocs.some(l => l.Code === code));
        
        missingCodes.forEach(code => {
          finalLocs.push({ Code: code, Name: "" });
        });
        
        setLocations(finalLocs);
      } catch (error) {
        console.error("Error loading locations:", error);
      } finally {
        setIsLoadingLocations(false);
      }
    };
    loadLocations();
  }, []);

  useEffect(() => {
    if (receipt?.Location_Code) {
      getTransferAllLocationCodes().then(locs => {
        const match = locs.find(l => l.Code === receipt.Location_Code);
        if (match) setLocationName(match.Name);
      }).catch(console.error);
    }
  }, [receipt?.Location_Code]);

  if (isHeaderLoading && !receipt) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading details...</span>
      </div>
    );
  }

  if (!receipt) {
    return <div className="p-4">No receipt selected</div>;
  }

  const handleFieldChange = (field: keyof QCReceiptHeader, value: any) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
    setReceipt(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleFieldCommit = async (field: keyof QCReceiptHeader, value: any) => {
    if (!receipt || isPosted) return;
    
    const currentValue = (receipt as any)[field];
    // Skip if value hasn't changed AND it's not currently tracked in editedFields
    if (currentValue === value && !(field in editedFields)) return;

    // Update local state first for immediate feedback
    setReceipt(prev => prev ? ({ ...prev, [field]: value }) : null);
    
    const result = await updateHeader(receipt.No, receipt["@odata.etag"] || "*", { [field]: value });
    if (result) {
      setReceipt(result);
      // Remove this specific field from editedFields
      setEditedFields(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      // Refresh the entire detail to ensure consistency
      refetchDetail();
    }
  };


  const handlePost = async () => {
    if (!receipt) return;
    const success = await postReceipt(receipt.No);
    if (success) {
      if (context?.onSuccess) {
        context.onSuccess();
      }
      closeTab(tabId);
    }
  };

  const handleDelete = async () => {
    if (!receipt) return;
    const success = await deleteReceipt(receipt.No);
    if (success) {
      if (context?.onSuccess) {
        context.onSuccess();
      }
      closeTab(tabId);
    }
  };

  const handleGenerateBardana = async () => {
    if (!receipt) return;
    await generateBardana(receipt.No);
  };

  const handleLineUpdate = (index: number, updatedLine: QCReceiptLine) => {
    setLines(prev => {
      const newLines = [...prev];
      newLines[index] = updatedLine;
      return newLines;
    });
    // Refresh header data when a line is updated
    refetchDetail();
  };

  const isHeaderDirty = Object.keys(editedFields).length > 0;

  const formatQty = (val?: number) => {
    if (val === undefined || val === null) return "-";
    return val.toLocaleString();
  };

  const getLocationName = (code: string) => {
    const loc = locations.find(l => l.Code === code);
    return loc?.Name || "";
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex flex-col gap-6 p-6 pb-20">
        {/* ACTION BAR */}
        <div className="flex items-center justify-between border-b pb-4 sticky top-0 bg-background/95 backdrop-blur-sm z-20">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{receipt.No}</h1>
            <p className="text-xs text-muted-foreground uppercase font-medium">
              {receipt.Item_Name} • {receipt.Buy_from_Vendor_Name}
            </p>
          </div>
          
          <div className="flex items-center gap-3">

             <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                receipt.Approval_Status === "Approved" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              }`}>
                {receipt.Approval_Status}
              </div>

            {!isPosted && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={
                    isDeleting ||
                    isPosting ||
                    isLinesLoading ||
                    isHeaderLoading ||
                    isHeaderDirty ||
                    isHeaderUpdating
                  }
                  className="gap-2 h-8 font-bold shadow-md hover:shadow-destructive/20 transition-all"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowConfirmPost(true)}
                  disabled={
                    isPosting ||
                    isLinesLoading ||
                    isHeaderLoading ||
                    isHeaderDirty ||
                    isHeaderUpdating
                  }
                  className="gap-2 h-8"
                >
                  {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Post QC Receipt
                </Button>
              </>
            )}

            {isPosted && (
              <Button
                size="sm"
                onClick={handleGenerateBardana}
                disabled={isGenerating || isHeaderLoading}
                className="gap-2 h-8 font-bold bg-green-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-600/20 transition-all"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Bardana
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SectionContainer title="">
             <SummaryField label="No." value={receipt.No} />
             <SummaryField label="Purchase Receipt No." value={receipt.Purchase_Receipt_No} />
             <SummaryField label="Item No." value={receipt.Item_No} />
             <SummaryField label="Vehicle No." value={receipt.Vehicle_No} />
             <SummaryField label="Item Code" value={receipt.Item_No} />
             <SummaryField label="Item Name" value={receipt.Item_Name} />
             <SummaryField label="Unit Of Measure" value={receipt.Unit_of_Measure} />
             <SummaryField label="Receipt Date" value={formatDate(receipt.Receipt_Date)} />
             <SummaryField 
               label="Location Code" 
               value={receipt.Location_Code ? (
                 locationName 
                   ? `${receipt.Location_Code} - ${locationName}` 
                   : receipt.Location_Code
               ) : "-"} 
             />
             <SummaryField label="Vendor No." value={receipt.Buy_from_Vendor_No} />
             <SummaryField label="Vendor Name" value={receipt.Buy_from_Vendor_Name} />
             <SummaryField label="PO No." value={receipt.Purchase_Order_No} />
             {isPosted && <SummaryField label="Bardana RPO" value={receipt.Bardana_RPO} />}
             <SummaryField label="Branch" value={receipt.Shortcut_Dimension_2_Code || receipt.Shortcut_Dimension_1_Code || userBranch} />
             <SummaryField label="Item Tracking" value={receipt.Item_Tracking} />
          </SectionContainer>

          <div className="rounded-xl border bg-muted/20 p-4 shadow-sm">
            <SectionContainer title="">
               <EditFormField 
                 label="QC Date" 
                 isReadOnly={isPosted}
               >
                 <DateInput 
                   value={receipt.QC_Date} 
                   onChange={(val) => handleFieldCommit("QC_Date", val)}
                   disabled={isPosted}
                 />
               </EditFormField>

                <EditFormField label="Inspection QTY" isReadOnly={isPosted}>
                  <CalculatorInput 
                    value={receipt.Inspection_Quantity || ""} 
                    onCommit={(val) => handleFieldCommit("Inspection_Quantity", val)}
                    disabled={isPosted}
                  />
                </EditFormField>

                <EditFormField label="Quantity to Accept" isReadOnly={isPosted}>
                  <CalculatorInput 
                    value={receipt.Quantity_to_Accept || ""} 
                    onCommit={(val) => handleFieldCommit("Quantity_to_Accept", val)}
                    disabled={isPosted}
                  />
                </EditFormField>

                <EditFormField label="Qty Accept (Dev.)" isReadOnly={isPosted}>
                  <CalculatorInput 
                    value={receipt.Qty_to_Accept_with_Deviation || ""} 
                    onCommit={(val) => handleFieldCommit("Qty_to_Accept_with_Deviation", val)}
                    disabled={isPosted}
                  />
                </EditFormField>

                <EditFormField label="Quantity to Reject" isReadOnly={isPosted}>
                  <CalculatorInput 
                    value={receipt.Quantity_to_Reject || ""} 
                    onCommit={(val) => handleFieldCommit("Quantity_to_Reject", val)}
                    disabled={isPosted}
                  />
                </EditFormField>

               <div className="flex flex-col gap-4 mt-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="accepted-with-approval" 
                      checked={receipt.Accepted_With_Approval} 
                      onCheckedChange={(val) => handleFieldCommit("Accepted_With_Approval", val)}
                      disabled={isPosted}
                    />
                    <Label htmlFor="accepted-with-approval" className="text-[11px] uppercase font-semibold text-muted-foreground">Accepted w/ Approval</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="create-bardana" 
                      checked={receipt.Create_Bardana} 
                      onCheckedChange={(val) => handleFieldCommit("Create_Bardana", val)}
                      disabled={isPosted}
                    />
                    <Label htmlFor="create-bardana" className="text-[11px] uppercase font-semibold text-muted-foreground">Create Bardana</Label>
                  </div>
               </div>

                <EditFormField label="Rebate %" isReadOnly={isPosted}>
                  <CalculatorInput 
                    value={receipt.Rabete_Percent || ""} 
                    onCommit={(val) => handleFieldCommit("Rabete_Percent", val)}
                    disabled={isPosted || !receipt.Accepted_With_Approval}
                  />
                </EditFormField>

               <EditFormField label="Store Location Code" isReadOnly={isPosted}>
                  <LocationSelect
                    value={receipt.Store_Location_Code || ""}
                    onChange={(val) => handleFieldCommit("Store_Location_Code", val)}
                    placeholder="Select Store Location"
                    branchCode={receipt.Shortcut_Dimension_2_Code || receipt.Shortcut_Dimension_1_Code || userBranch}
                    disabled={isPosted}
                    className="h-10"
                  />
               </EditFormField>

               <div className="md:col-span-2 lg:col-span-3">
                 <EditFormField label="Comments" isReadOnly={isPosted}>
                   <Textarea 
                     value={receipt.Comment || ""} 
                     onChange={(e) => handleFieldChange("Comment", e.target.value)}
                     onBlur={(e) => handleFieldCommit("Comment", e.target.value)}
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
        <div className="flex flex-col gap-2">
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

      <AlertDialog open={showConfirmPost} onOpenChange={setShowConfirmPost}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to post QC Receipt {receipt.No}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePost}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete QC Receipt
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete QC Receipt <strong>{receipt.No}</strong>? This will permanently delete the header and all associated line items from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    <div className="flex flex-col gap-1 overflow-hidden">
      <Label className="text-[11px] uppercase font-semibold tracking-tight text-muted-foreground">{label}</Label>
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
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-muted py-1 flex items-center justify-between">
          {title}
        </h2>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {children}
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: any }) {
  const isValueEmpty = value === undefined || value === null || value === "" || value === " ";
  
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase font-semibold tracking-tight text-muted-foreground">{label}</span>
      <div className={`text-sm font-medium ${isValueEmpty ? 'text-muted-foreground/30 italic' : 'text-foreground'}`}>
        {isValueEmpty ? '-' : (typeof value === 'number' ? value.toLocaleString() : value)}
      </div>
    </div>
  );
}

