"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  getInwardGateEntryLines, 
  postInwardGateEntry,
  createInwardGateEntryHeader,
  updateInwardGateEntryHeader,
  type InwardGateEntryHeader, 
  type InwardGateEntryLine,
  type InwardGateEntrySourceType
} from "@/lib/api/services/inward-gate-entry.service";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, CheckCircle, Save, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { SourceLookupModal } from "./source-lookup-modal";
import { LocationSelect } from "@/components/forms/shared/location-select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface InwardGateEntryFormProps {
  tabId: string;
  context?: Record<string, unknown>;
}

export function InwardGateEntryForm({ tabId, context }: InwardGateEntryFormProps) {
  const mode = (context?.mode as "view" | "create" | "edit") || "view";
  const initialEntry = context?.entry as InwardGateEntryHeader;
  
  const [entry, setEntry] = useState<Partial<InwardGateEntryHeader>>(initialEntry || {
    Entry_Type: "Inward",
    Document_Date: new Date().toISOString().split("T")[0],
    Document_Time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    Station_From_To: "",
    Description: "",
    Item_Description: "",
    Posting_Date: new Date().toISOString().split("T")[0],
    Posting_Time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    LR_RR_No: "",
    LR_RR_Date: new Date().toISOString().split("T")[0],
    Vehicle_No: "",
    Posting_No_Series: "GI",
    Gross_Weight: 0,
    Tier_Weight: 0,
    Net_Weight: 0,
    Per_Bag_Freight_Charges: 0,
    Total_Freight_Amount: 0,
    Transporter_Name: "",
    No_of_Bags: 0,
  });

  const [lines, setLines] = useState<InwardGateEntryLine[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  
  const { tab, markAsSaved, updateTab, closeTab } = useFormStack(tabId);

  const fetchLines = useCallback(async () => {
    // Only fetch if we have a document number and it's not being edited
    if (!initialEntry?.No) return;
    
    setIsLoadingLines(true);
    try {
      const entryType = initialEntry.Entry_Type || "Inward";
      const data = await getInwardGateEntryLines(initialEntry.No, entryType);
      setLines(data);
    } catch (error) {
      console.error("Error fetching lines:", error);
      toast.error("Failed to fetch line items");
    } finally {
      setIsLoadingLines(false);
    }
  }, [initialEntry?.No, initialEntry?.Entry_Type]);

  useEffect(() => {
    if (mode === "view" && initialEntry?.No) {
      fetchLines();
      markAsSaved();
    } else if (mode === "create") {
      updateTab({ isSaved: false });
    }
  }, [mode, initialEntry?.No]); // Removed fetchLines and others to avoid loop

  const handleInputChange = (field: keyof InwardGateEntryHeader, value: any) => {
    setEntry(prev => {
      const next = { ...prev, [field]: value };
      
      // Calculate Net Weight if Gross or Tier changes
      if (field === "Gross_Weight" || field === "Tier_Weight") {
        const gross = field === "Gross_Weight" ? (parseFloat(value) || 0) : (prev.Gross_Weight || 0);
        const tier = field === "Tier_Weight" ? (parseFloat(value) || 0) : (prev.Tier_Weight || 0);
        next.Net_Weight = Math.max(0, gross - tier);
      }
      
      return next;
    });
    updateTab({ isSaved: false });
  };

  async function handleSave() {
    setIsSaving(true);
    try {
      // Clean payload: remove empty strings, Net_Weight, and Posting_No_Series
      // For updates (PATCH), only send modified fields
      const cleanPayload = Object.entries(entry).reduce((acc, [key, value]) => {
        // Exclusions
        if (key === "Net_Weight" || key === "Posting_No_Series" || key === "@odata.etag" || key === "id") return acc;
        if (value === "" || value === undefined || value === null) return acc;
        
        // Dirty tracking for updates
        if (mode !== "create") {
          const initialValue = initialEntry?.[key as keyof InwardGateEntryHeader];
          if (value === initialValue) return acc;
        }

        // Ensure time fields have :00 if they only have HH:mm
        let processedValue = value;
        if ((key === "Document_Time" || key === "Posting_Time") && typeof processedValue === "string") {
          if (processedValue.length === 5) processedValue = `${processedValue}:00`;
        }
        
        acc[key] = processedValue;
        return acc;
      }, {} as any);

      if (mode === "create") {
        const result = await createInwardGateEntryHeader(cleanPayload);
        toast.success(`Gate Entry ${result.No} created successfully`);
        setEntry(result);
        
        // Update tab title and mode
        updateTab({
          title: `Gate Entry: ${result.No}`,
          context: { ...context, entry: result, mode: "view" },
          isSaved: true
        });
        
        // Fetch lines if needed
        const onRefetch = context?.refetch as (() => void) | undefined;
        onRefetch?.();
      } else {
        const identifier = entry.No;
        const entryType = entry.Entry_Type || "Inward";
        if (!identifier) throw new Error("Document No. is missing");
        
        // If no fields changed, just mark as saved and return
        if (Object.keys(cleanPayload).length === 0) {
          toast.info("No changes to update");
          markAsSaved();
          return;
        }

        const result = await updateInwardGateEntryHeader(identifier, entryType, cleanPayload);
        toast.success(`Gate Entry ${result.No} updated successfully`);
        setEntry(result);
        
        updateTab({
          context: { ...context, entry: result },
          isSaved: true
        });
        
        const onRefetch = context?.refetch as (() => void) | undefined;
        onRefetch?.();
      }
      markAsSaved();
    } catch (error: any) {
      console.error("Error saving gate entry:", error);
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePost() {
    const docNo = entry.No;
    if (!docNo) {
      toast.error("Document number is missing");
      return;
    }
    
    setIsPosting(true);
    try {
      const result = await postInwardGateEntry(docNo);
      toast.success(result || "Gate entry posted successfully");
      
      // Update local state to posted if status is returned
      handleInputChange("Status", "Posted");
      
      const onRefetch = context?.refetch as (() => void) | undefined;
      onRefetch?.();
      closeTab();
    } catch (error: any) {
      console.error("Error posting gate entry:", error);
      toast.error(error.message || "Failed to post gate entry");
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Action Bar ── */}
      <div className="flex items-center justify-end gap-2 border-b px-4 py-2">
        <div className="mr-auto flex items-center gap-2">
          <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            Status:
          </span>
          <Badge
            variant="outline"
            className={cn(
              "h-6 px-3 text-[10px] font-bold tracking-wider uppercase border-blue-200 bg-blue-500/10 text-blue-600"
            )}
          >
            {(entry.Status as string) || "Open"}
          </Badge>
          <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {entry.No ? `— ${entry.No}` : mode === "create" ? "— New Gate Entry" : ""}
          </span>
        </div>

        {mode === "view" ? (
          <>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || tab?.isSaved} 
              size="sm"
              variant="outline"
              className="h-8 border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Update Changes
            </Button>
            <Button 
              onClick={handlePost} 
              disabled={isPosting} 
              size="sm"
              className="h-8 bg-green-600 hover:bg-green-700 text-white"
            >
              {isPosting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              Post Entry
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => closeTab()} className="h-8">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving} 
              size="sm"
              className="h-8"
            >
              {isSaving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              {mode === "create" ? "Create Entry" : "Save Changes"}
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* General Section */}
        <section className="rounded-md border p-4 space-y-4">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {mode !== "create" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase">No.</label>
                <Input
                  value={entry.No || ""}
                  onChange={(e) => handleInputChange("No", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Location Code</label>
              <LocationSelect
                value={entry.Location_Code || ""}
                onChange={(v) => handleInputChange("Location_Code", v)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Station From/To</label>
              <Input
                value={entry.Station_From_To || ""}
                onChange={(e) => handleInputChange("Station_From_To", e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Document Date</label>
              <DateInput
                value={entry.Document_Date || ""}
                onChange={(v) => handleInputChange("Document_Date", v)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Document Time</label>
              <Input
                type="time"
                value={entry.Document_Time || ""}
                onChange={(e) => handleInputChange("Document_Time", e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Posting Date</label>
              <DateInput
                value={entry.Posting_Date || ""}
                onChange={(v) => handleInputChange("Posting_Date", v)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Posting Time</label>
              <Input
                type="time"
                value={entry.Posting_Time || ""}
                onChange={(e) => handleInputChange("Posting_Time", e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">LR/RR No.</label>
              <Input
                value={entry.LR_RR_No || ""}
                onChange={(e) => handleInputChange("LR_RR_No", e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">LR/RR Date</label>
              <DateInput
                value={entry.LR_RR_Date || ""}
                onChange={(v) => handleInputChange("LR_RR_Date", v)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Vehicle No.</label>
              <Input
                value={entry.Vehicle_No || ""}
                onChange={(e) => handleInputChange("Vehicle_No", e.target.value.toUpperCase())}
                className="h-8 text-xs font-mono"
              />
            </div>

            {mode !== "create" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase">Posting No. Series</label>
                <Input
                  value={entry.Posting_No_Series || ""}
                  onChange={(e) => handleInputChange("Posting_No_Series", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Gross Weight</label>
              <Input
                type="number"
                value={entry.Gross_Weight || 0}
                onChange={(e) => handleInputChange("Gross_Weight", parseFloat(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Tier Weight</label>
              <Input
                type="number"
                value={entry.Tier_Weight || 0}
                onChange={(e) => handleInputChange("Tier_Weight", parseFloat(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Net Weight</label>
              <div className="h-8 flex items-center px-3 bg-muted/30 rounded border border-dashed text-xs font-mono text-muted-foreground">
                {(entry.Net_Weight as number || 0).toFixed(2)}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Per Bag Freight Chg.</label>
              <Input
                type="number"
                value={entry.Per_Bag_Freight_Charges || 0}
                onChange={(e) => handleInputChange("Per_Bag_Freight_Charges", parseFloat(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Total Freight Amt</label>
              <Input
                type="number"
                value={entry.Total_Freight_Amount || 0}
                onChange={(e) => handleInputChange("Total_Freight_Amount", parseFloat(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Transporter Name</label>
              <Input
                value={entry.Transporter_Name || ""}
                onChange={(e) => handleInputChange("Transporter_Name", e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">No. of Bags</label>
              <Input
                type="number"
                value={entry.No_of_Bags || 0}
                onChange={(e) => handleInputChange("No_of_Bags", parseInt(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Description</label>
              <Input
                value={entry.Description || ""}
                onChange={(e) => handleInputChange("Description", e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">Item Description</label>
              <Input
                value={entry.Item_Description || ""}
                onChange={(e) => handleInputChange("Item_Description", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </section>

        {/* Line Items */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold tracking-wider uppercase">
              Line Items
            </h3>
            <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
              {lines.length} Line{lines.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="border rounded-md overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="w-12 text-[10px] font-bold uppercase tracking-wider">#</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Challan No.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Challan Date</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Source Type</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Source No.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Source Name</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLines ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic text-[10px]">
                      {mode === "create" ? "Lines will be auto-filled from source" : "No lines found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => (
                    <TableRow key={line.id || line.Line_No || `line-${index}`} className="hover:bg-muted/30 transition-colors border-b text-[11px]">
                      <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{line.Challan_No}</TableCell>
                      <TableCell>{line.Challan_Date ? new Date(line.Challan_Date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{line.Source_Type}</TableCell>
                      <TableCell className="font-medium">{line.Source_No}</TableCell>
                      <TableCell>{line.Source_Name}</TableCell>
                      <TableCell className="text-muted-foreground">{line.Description}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <SourceLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        sourceType={entry.Source_Type as InwardGateEntrySourceType}
        onSelect={(no, data) => {
          handleInputChange("Source_No", no);
          if (data.Buy_from_Vendor_Name || data.Sell_to_Customer_Name || data.Transfer_from_Name) {
            handleInputChange("Transporter_Name", data.Buy_from_Vendor_Name || data.Sell_to_Customer_Name || data.Transfer_from_Name);
          }
          setIsLookupOpen(false);
        }}
      />
    </div>
  );
}
