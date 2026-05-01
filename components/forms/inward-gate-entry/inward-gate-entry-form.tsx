"use client";

import { LocationSelect } from "@/components/forms/shared/location-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  createInwardGateEntryHeader,
  createInwardGateEntryLine,
  deleteInwardGateEntryLine,
  getInwardGateEntryLines,
  postInwardGateEntry,
  updateInwardGateEntryHeader,
  updateInwardGateEntryLine,
  type InwardGateEntryHeader,
  type InwardGateEntryLine,
  type InwardGateEntrySourceType,
} from "@/lib/api/services/inward-gate-entry.service";
import { getWebUser, type WebUser } from "@/lib/api/services/web-user.service";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SourceLookupModal } from "./source-lookup-modal";
import { LineEntryModal } from "./line-entry-modal";
import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import { getAuthCredentials } from "@/lib/auth/storage";
import { isPostingDateValid } from "@/lib/utils/posting-date";

interface InwardGateEntryFormProps {
  tabId: string;
  context?: Record<string, unknown>;
}

export function InwardGateEntryForm({
  tabId,
  context,
}: InwardGateEntryFormProps) {
  const mode = (context?.mode as "view" | "create" | "edit") || "view";
  const initialEntry = context?.entry as InwardGateEntryHeader;

  const [entry, setEntry] = useState<Partial<InwardGateEntryHeader>>(
    initialEntry || {
      Entry_Type: "Inward",
      Document_Date: new Date().toISOString().split("T")[0],
      Document_Time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      Station_From_To: "",
      Description: "",
      Item_Description: "",
      Posting_Date: new Date().toISOString().split("T")[0],
      Posting_Time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
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
      Shortcut_Dimension_1_Code: "",
      Shortcut_Dimension_2_Code: "",
    },
  );

  const [webUserProfile, setWebUserProfile] = useState<WebUser | null>(null);
  const [authUserId, setAuthUserId] = useState<string | undefined>(undefined);

  const [lines, setLines] = useState<InwardGateEntryLine[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<Partial<InwardGateEntryLine> | null>(null);
  const [lineModalMode, setLineModalMode] = useState<"add" | "edit">("add");
  
  // Post Dialog State
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [postDetails, setPostDetails] = useState({
    postingDate: new Date().toISOString().split("T")[0],
    postingTime: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  });

  const { tab, markAsSaved, updateTab, closeTab } = useFormStack(tabId);

  const fetchLines = useCallback(async () => {
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
    const creds = getAuthCredentials();
    if (creds?.userID) {
      setAuthUserId(creds.userID);
      getWebUser(creds.userID).then(setWebUserProfile).catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (mode === "create") {
      const today = new Date().toISOString().split("T")[0];
      
      setEntry(prev => {
        const updates: Partial<InwardGateEntryHeader> = {};
        
        if (!prev.LR_RR_Date || prev.LR_RR_Date === "0001-01-01") {
          updates.LR_RR_Date = today;
        }

        if (webUserProfile) {
          const from = webUserProfile.Allow_Posting_From?.split("T")[0];
          const to = webUserProfile.Allow_Posting_To?.split("T")[0];
          const isAfterFrom = !from || from === "0001-01-01" || today >= from;
          const isBeforeTo = !to || to === "0001-01-01" || today <= to;

          if (isAfterFrom && isBeforeTo) {
            if (!prev.Posting_Date || prev.Posting_Date === "0001-01-01") updates.Posting_Date = today;
            if (!prev.Document_Date || prev.Document_Date === "0001-01-01") updates.Document_Date = today;
          }
        } else {
          if (!prev.Posting_Date || prev.Posting_Date === "0001-01-01") updates.Posting_Date = today;
          if (!prev.Document_Date || prev.Document_Date === "0001-01-01") updates.Document_Date = today;
        }

        if (Object.keys(updates).length > 0) return { ...prev, ...updates };
        return prev;
      });
    }
  }, [mode, webUserProfile]);

  useEffect(() => {
    if (mode === "view" && initialEntry?.No) {
      fetchLines();
      markAsSaved();
    } else if (mode === "create") {
      updateTab({ isSaved: false });
    }
  }, [mode, initialEntry?.No]);

  const handleInputChange = (
    field: keyof InwardGateEntryHeader,
    value: any,
  ) => {
    // Prevent negative values for numerical fields
    let processedValue = value;
    const numericalFields: (keyof InwardGateEntryHeader)[] = [
      "Gross_Weight",
      "Tier_Weight",
      "Per_Bag_Freight_Charges",
      "Total_Freight_Amount",
      "No_of_Bags",
    ];

    if (numericalFields.includes(field)) {
      processedValue = Math.max(0, parseFloat(value) || 0);
    }

    setEntry((prev) => {
      const next = { ...prev, [field]: processedValue };

      if (field === "Gross_Weight" || field === "Tier_Weight") {
        const gross =
          field === "Gross_Weight"
            ? (processedValue as number)
            : prev.Gross_Weight || 0;
        const tier =
          field === "Tier_Weight"
            ? (processedValue as number)
            : prev.Tier_Weight || 0;
        next.Net_Weight = Math.max(0, gross - tier);
      }

      return next;
    });
    updateTab({ isSaved: false });
  };

  async function handleSave() {
    if (!isPostingDateValid(entry.Posting_Date, webUserProfile)) return;

    setIsSaving(true);
    try {
      const cleanPayload = Object.entries(entry).reduce((acc, [key, value]) => {
        if (
          key === "Net_Weight" ||
          key === "Posting_No_Series" ||
          key === "@odata.etag" ||
          key === "id" ||
          key === "Shortcut_Dimension_2_Code"
        )
          return acc;
        if (value === "" || value === undefined || value === null || value === 0) return acc;

        if (mode !== "create") {
          const initialValue =
            initialEntry?.[key as keyof InwardGateEntryHeader];
          if (value === initialValue) return acc;
        }

        let processedValue = value;
        if (
          (key === "Document_Time" || key === "Posting_Time") &&
          typeof processedValue === "string"
        ) {
          if (processedValue.length === 5)
            processedValue = `${processedValue}:00`;
        }

        acc[key] = processedValue;
        return acc;
      }, {} as any);

      if (mode === "create") {
        const result = await createInwardGateEntryHeader(cleanPayload);
        toast.success(`Gate Entry ${result.No} created successfully`);
        setEntry(result);

        updateTab({
          title: `Gate Entry: ${result.No}`,
          context: { ...context, entry: result, mode: "view" },
          isSaved: true,
        });

        const onRefetch = context?.refetch as (() => void) | undefined;
        onRefetch?.();
      } else {
        const identifier = entry.No;
        const entryType = entry.Entry_Type || "Inward";
        if (!identifier) throw new Error("Document No. is missing");

        if (Object.keys(cleanPayload).length === 0) {
          toast.info("No changes to update");
          markAsSaved();
          return;
        }

        const result = await updateInwardGateEntryHeader(
          identifier,
          entryType,
          cleanPayload,
        );
        toast.success(`Gate Entry ${result.No} updated successfully`);
        setEntry(result);

        updateTab({
          context: { ...context, entry: result },
          isSaved: true,
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

  const handlePostClick = () => {
    if (!entry.No) {
      toast.error("Please save the entry first");
      return;
    }
    setPostDetails({
      postingDate: new Date().toISOString().split("T")[0],
      postingTime: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    });
    setIsPostDialogOpen(true);
  };

  async function handleConfirmPost() {
    const docNo = entry.No;
    if (!docNo) return;

    if (!isPostingDateValid(postDetails.postingDate, webUserProfile)) return;

    setIsPosting(true);
    try {
      // 1. Update the header with the new posting date and time
      const timeStr = postDetails.postingTime.length === 5 ? `${postDetails.postingTime}:00` : postDetails.postingTime;
      
      await updateInwardGateEntryHeader(docNo, entry.Entry_Type || "Inward", {
        Posting_Date: postDetails.postingDate,
        Posting_Time: timeStr,
      });

      // 2. Perform the actual posting
      const result = await postInwardGateEntry(docNo);
      toast.success(result || "Gate entry posted successfully");

      handleInputChange("Status", "Posted");
      setIsPostDialogOpen(false);

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


  const handleAddLine = () => {
    const nextLineNo = lines.length > 0 ? Math.max(...lines.map(l => l.Line_No)) + 10000 : 10000;
    setSelectedLine({
      Entry_Type: entry.Entry_Type || "Inward",
      Gate_Entry_No: entry.No || "",
      Line_No: nextLineNo,
      Challan_Date: new Date().toISOString().split("T")[0],
      Source_Type: "Purchase Order",
    });
    setLineModalMode("add");
    setIsLineModalOpen(true);
  };

  const handleEditLine = (line: InwardGateEntryLine) => {
    setSelectedLine(line);
    setLineModalMode("edit");
    setIsLineModalOpen(true);
  };

  const handleSaveLineFromModal = async (lineData: Partial<InwardGateEntryLine>) => {
    if (!entry.No) {
      toast.error("Please save the header first");
      throw new Error("Header not saved");
    }

    try {
      if (lineData["@odata.etag"]) {
        await updateInwardGateEntryLine(entry.No, entry.Entry_Type || "Inward", lineData.Line_No!, lineData);
        toast.success("Line updated");
      } else {
        await createInwardGateEntryLine({
          ...lineData,
          Gate_Entry_No: entry.No,
          Entry_Type: entry.Entry_Type || "Inward"
        } as InwardGateEntryLine);
        toast.success("Line added");
      }
      fetchLines();
    } catch (error: any) {
      console.error("Error saving line:", error);
      toast.error(error.message || "Failed to save line");
      throw error;
    }
  };

  const handleDeleteLine = async (line: InwardGateEntryLine) => {
    if (!line["@odata.etag"]) {
      setLines(lines.filter((l) => l.Line_No !== line.Line_No));
      return;
    }

    if (!confirm("Are you sure you want to delete this line?")) return;

    try {
      await deleteInwardGateEntryLine(
        entry.No || "",
        entry.Entry_Type || "Inward",
        line.Line_No,
      );
      toast.success("Line deleted");
      fetchLines();
    } catch (error: any) {
      console.error("Error deleting line:", error);
      toast.error("Failed to delete line");
    }
  };

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      {/* ── Action Bar ── */}
      <div className="flex items-center justify-end gap-2 border-b px-4 py-2">
        <div className="mr-auto flex items-center gap-2">
          <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            Status:
          </span>
          <Badge
            variant="outline"
            className={cn(
              "h-6 border-blue-200 bg-blue-500/10 px-3 text-[10px] font-bold tracking-wider text-blue-600 uppercase",
            )}
          >
            {(entry.Status as string) || "Open"}
          </Badge>
          <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {entry.No
              ? `— ${entry.No}`
              : mode === "create"
                ? "— New Gate Entry"
                : ""}
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
              onClick={handlePostClick}
              disabled={isPosting}
              size="sm"
              className="h-8 bg-green-600 text-white hover:bg-green-700"
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => closeTab()}
              className="h-8"
            >
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

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* General Section */}
        <section className="space-y-4 rounded-md border p-4">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Branch
              </label>
              <CascadingDimensionSelect
                dimensionType="BRANCH"
                value={entry.Shortcut_Dimension_2_Code || ""}
                onChange={(v) => {
                  handleInputChange("Shortcut_Dimension_2_Code", v);
                  handleInputChange("Location_Code", "");
                }}
                placeholder="Select Branch"
                userId={authUserId}
                compactWhenSingle
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Location Code
              </label>
              <LocationSelect
                value={entry.Location_Code || ""}
                onChange={(v) => handleInputChange("Location_Code", v)}
                branchCode={entry.Shortcut_Dimension_2_Code}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Station From/To
              </label>
              <Input
                value={entry.Station_From_To || ""}
                onChange={(e) =>
                  handleInputChange("Station_From_To", e.target.value)
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Document Date
              </label>
              <DateInput
                value={entry.Document_Date || ""}
                onChange={(v) => handleInputChange("Document_Date", v)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Document Time
              </label>
              <Input
                type="time"
                value={entry.Document_Time || ""}
                onChange={(e) =>
                  handleInputChange("Document_Time", e.target.value)
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                LR/RR No.
              </label>
              <Input
                value={entry.LR_RR_No || ""}
                onChange={(e) => handleInputChange("LR_RR_No", e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                LR/RR Date
              </label>
              <DateInput
                value={entry.LR_RR_Date || ""}
                onChange={(v) => handleInputChange("LR_RR_Date", v)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Vehicle No.
              </label>
              <Input
                value={entry.Vehicle_No || ""}
                onChange={(e) =>
                  handleInputChange("Vehicle_No", e.target.value.toUpperCase())
                }
                className="h-8 font-mono text-xs"
              />
            </div>



            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Gross Weight
              </label>
              <Input
                type="number"
                min={0}
                onFocus={(e) => e.target.select()}
                value={entry.Gross_Weight || 0}
                onChange={(e) =>
                  handleInputChange(
                    "Gross_Weight",
                    e.target.value,
                  )
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Tier Weight
              </label>
              <Input
                type="number"
                min={0}
                onFocus={(e) => e.target.select()}
                value={entry.Tier_Weight || 0}
                onChange={(e) =>
                  handleInputChange(
                    "Tier_Weight",
                    e.target.value,
                  )
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Net Weight
              </label>
              <div className="bg-muted/30 text-muted-foreground flex h-8 items-center rounded border border-dashed px-3 font-mono text-xs">
                {((entry.Net_Weight as number) || 0).toFixed(2)}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Per Bag Freight Chg.
              </label>
              <Input
                type="number"
                min={0}
                onFocus={(e) => e.target.select()}
                value={entry.Per_Bag_Freight_Charges || 0}
                onChange={(e) =>
                  handleInputChange(
                    "Per_Bag_Freight_Charges",
                    e.target.value,
                  )
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Total Freight Amt
              </label>
              <Input
                type="number"
                min={0}
                onFocus={(e) => e.target.select()}
                value={entry.Total_Freight_Amount || 0}
                onChange={(e) =>
                  handleInputChange(
                    "Total_Freight_Amount",
                    e.target.value,
                  )
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Transporter Name
              </label>
              <Input
                value={entry.Transporter_Name || ""}
                onChange={(e) =>
                  handleInputChange("Transporter_Name", e.target.value)
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                No. of Bags
              </label>
              <Input
                type="number"
                min={0}
                onFocus={(e) => e.target.select()}
                value={entry.No_of_Bags || 0}
                onChange={(e) =>
                  handleInputChange("No_of_Bags", e.target.value)
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Description
              </label>
              <Input
                value={entry.Description || ""}
                onChange={(e) =>
                  handleInputChange("Description", e.target.value)
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Item Description
              </label>
              <Input
                value={entry.Item_Description || ""}
                onChange={(e) =>
                  handleInputChange("Item_Description", e.target.value)
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
        </section>

        {/* Line Items */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                <FileText className="text-muted-foreground h-3 w-3" />
                Line Items
              </h3>
              <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
                {lines.length} Line{lines.length !== 1 ? "s" : ""}
              </span>
            </div>
            {mode !== "view" ||
              (true && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  className="h-7 gap-1.5 border-dashed text-[10px] font-bold tracking-wider uppercase"
                >
                  <Plus className="h-3 w-3" />
                  Add Line
                </Button>
              ))}
          </div>

          <div className="bg-card overflow-hidden rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-b hover:bg-transparent">
                  <TableHead className="w-12 text-[10px] font-bold tracking-wider uppercase">
                    #
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                    Challan No.
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                    Challan Date
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                    Source Type
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                    Source No.
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                    Source Name
                  </TableHead>
                  <TableHead className="text-[10px] font-bold tracking-wider uppercase">
                    Description
                  </TableHead>
                  <TableHead className="w-20 text-right text-[10px] font-bold tracking-wider uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLines ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : lines.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-muted-foreground h-24 text-center text-[10px] italic"
                    >
                      No lines found. Click "Add Line" to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => {
                    return (
                      <TableRow
                        key={line.id || line.Line_No || `line-${index}`}
                        className="hover:bg-muted/30 border-b text-[11px] transition-colors"
                      >
                        <TableCell className="text-muted-foreground font-mono">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {line.Challan_No}
                          </span>
                        </TableCell>
                        <TableCell>
                          {line.Challan_Date ? (
                            new Date(line.Challan_Date).toLocaleDateString()
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {line.Source_Type}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {line.Source_No}
                          </span>
                        </TableCell>
                        <TableCell>
                          {line.Source_Name}
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {line.Description}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700"
                              onClick={() => handleEditLine(line)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteLine(line)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <LineEntryModal
          isOpen={isLineModalOpen}
          onClose={() => setIsLineModalOpen(false)}
          onSave={handleSaveLineFromModal}
          initialData={selectedLine || undefined}
          mode={lineModalMode}
          branchCode={entry.Shortcut_Dimension_2_Code}
          locationCode={entry.Location_Code}
        />
      </div>

      <SourceLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        sourceType={entry.Source_Type as InwardGateEntrySourceType}
        branchCode={entry.Shortcut_Dimension_2_Code}
        locationCode={entry.Location_Code}
        onSelect={(no, data) => {
          handleInputChange("Source_No", no);
          if (
            data.Buy_from_Vendor_Name ||
            data.Sell_to_Customer_Name ||
            data.Transfer_from_Name
          ) {
            handleInputChange(
              "Transporter_Name",
              data.Buy_from_Vendor_Name ||
                data.Sell_to_Customer_Name ||
                data.Transfer_from_Name,
            );
          }
          setIsLookupOpen(false);
        }}
      />

      {/* Post Entry Dialog */}
      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider">
              Confirm Post Entry
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase tracking-wider">
                Posting Date
              </Label>
              <div className="col-span-3">
                <DateInput
                  value={postDetails.postingDate}
                  onChange={(v) => setPostDetails(prev => ({ ...prev, postingDate: v }))}
                  min={webUserProfile?.Allow_Posting_From?.split("T")[0]}
                  max={webUserProfile?.Allow_Posting_To?.split("T")[0]}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase tracking-wider">
                Posting Time
              </Label>
              <Input
                type="time"
                value={postDetails.postingTime}
                onChange={(e) => setPostDetails(prev => ({ ...prev, postingTime: e.target.value }))}
                className="col-span-3 h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPostDialogOpen(false)}
              className="h-8 text-[10px] font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPost}
              disabled={isPosting}
              size="sm"
              className="h-8 bg-green-600 text-white hover:bg-green-700 text-[10px] font-bold uppercase tracking-wider"
            >
              {isPosting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Confirm Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
