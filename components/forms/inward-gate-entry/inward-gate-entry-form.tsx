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
  Check,
  CheckCircle,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SourceLookupModal } from "./source-lookup-modal";
import { LineEntryModal } from "./line-entry-modal";
import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import { getAuthCredentials } from "@/lib/auth/storage";

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

  const [lines, setLines] = useState<InwardGateEntryLine[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<Partial<InwardGateEntryLine> | null>(null);
  const [lineModalMode, setLineModalMode] = useState<"add" | "edit">("add");
  const [isSavingLine, setIsSavingLine] = useState<number | null>(null);

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
    const creds = getAuthCredentials();
    if (creds?.userID) {
      getWebUser(creds.userID).then(setWebUserProfile).catch(console.error);
    }
  }, []);

  // Validation helper
  const isPostingDateValid = (date?: string) => {
    if (!date) return false;
    if (!webUserProfile) return true;
    
    const postingDate = new Date(date);
    const from = webUserProfile.Allow_Posting_From?.split("T")[0];
    const to = webUserProfile.Allow_Posting_To?.split("T")[0];

    if (from && from !== "0001-01-01") {
      const fromDate = new Date(from);
      if (postingDate < fromDate) {
        toast.error(`Posting Date must be on or after ${fromDate.toLocaleDateString()}`);
        return false;
      }
    }

    if (to && to !== "0001-01-01") {
      const toDate = new Date(to);
      if (postingDate > toDate) {
        toast.error(`Posting Date must be on or before ${toDate.toLocaleDateString()}`);
        return false;
      }
    }

    return true;
  };

  // Update default dates once profile is loaded (only for create mode)
  useEffect(() => {
    if (mode === "create") {
      const today = new Date().toISOString().split("T")[0];
      
      setEntry(prev => {
        const updates: Partial<InwardGateEntryHeader> = {};
        
        // LR/RR Date always defaults to today regardless of profile range
        if (!prev.LR_RR_Date || prev.LR_RR_Date === "0001-01-01") {
          updates.LR_RR_Date = today;
        }

        // Posting Date defaults to today, but only if it's within the allowed range
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
          // If no profile yet, still default to today
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
  }, [mode, initialEntry?.No]); // Removed fetchLines and others to avoid loop

  const handleInputChange = (
    field: keyof InwardGateEntryHeader,
    value: any,
  ) => {
    setEntry((prev) => {
      const next = { ...prev, [field]: value };

      // Calculate Net Weight if Gross or Tier changes
      if (field === "Gross_Weight" || field === "Tier_Weight") {
        const gross =
          field === "Gross_Weight"
            ? parseFloat(value) || 0
            : prev.Gross_Weight || 0;
        const tier =
          field === "Tier_Weight"
            ? parseFloat(value) || 0
            : prev.Tier_Weight || 0;
        next.Net_Weight = Math.max(0, gross - tier);
      }

      return next;
    });
    updateTab({ isSaved: false });
  };

  async function handleSave() {
    if (!isPostingDateValid(entry.Posting_Date)) return;

    setIsSaving(true);
    try {
      // Clean payload: remove empty strings, Net_Weight, and Posting_No_Series
      // For updates (PATCH), only send modified fields
      const cleanPayload = Object.entries(entry).reduce((acc, [key, value]) => {
        // Exclusions
        if (
          key === "Net_Weight" ||
          key === "Posting_No_Series" ||
          key === "@odata.etag" ||
          key === "id"
        )
          return acc;
        if (value === "" || value === undefined || value === null) return acc;

        // Dirty tracking for updates
        if (mode !== "create") {
          const initialValue =
            initialEntry?.[key as keyof InwardGateEntryHeader];
          if (value === initialValue) return acc;
        }

        // Ensure time fields have :00 if they only have HH:mm
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

        // Update tab title and mode
        updateTab({
          title: `Gate Entry: ${result.No}`,
          context: { ...context, entry: result, mode: "view" },
          isSaved: true,
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

  async function handlePost() {
    const docNo = entry.No;
    if (!docNo) {
      toast.error("Document number is missing");
      return;
    }

    if (!isPostingDateValid(entry.Posting_Date)) return;

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
      // Just local remove if not saved to server
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
              onClick={handlePost}
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
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                LOB
              </label>
              <CascadingDimensionSelect
                dimensionType="LOB"
                value={entry.Shortcut_Dimension_1_Code || ""}
                onChange={(v) => {
                  handleInputChange("Shortcut_Dimension_1_Code", v);
                  handleInputChange("Shortcut_Dimension_2_Code", "");
                  handleInputChange("Location_Code", "");
                }}
                placeholder="Select LOB"
                userId={getAuthCredentials()?.userID}
                compactWhenSingle
              />
            </div>

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
                lobValue={entry.Shortcut_Dimension_1_Code}
                userId={getAuthCredentials()?.userID}
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
                min={webUserProfile?.Allow_Posting_From?.split("T")[0]}
                max={webUserProfile?.Allow_Posting_To?.split("T")[0]}
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
                Posting Date
              </label>
              <DateInput
                value={entry.Posting_Date || ""}
                onChange={(v) => handleInputChange("Posting_Date", v)}
                min={webUserProfile?.Allow_Posting_From?.split("T")[0]}
                max={webUserProfile?.Allow_Posting_To?.split("T")[0]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Posting Time
              </label>
              <Input
                type="time"
                value={entry.Posting_Time || ""}
                onChange={(e) =>
                  handleInputChange("Posting_Time", e.target.value)
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

            {mode !== "create" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wider uppercase">
                  Posting No. Series
                </label>
                <Input
                  value={entry.Posting_No_Series || ""}
                  onChange={(e) =>
                    handleInputChange("Posting_No_Series", e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider uppercase">
                Gross Weight
              </label>
              <Input
                type="number"
                value={entry.Gross_Weight || 0}
                onChange={(e) =>
                  handleInputChange(
                    "Gross_Weight",
                    parseFloat(e.target.value) || 0,
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
                value={entry.Tier_Weight || 0}
                onChange={(e) =>
                  handleInputChange(
                    "Tier_Weight",
                    parseFloat(e.target.value) || 0,
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
                value={entry.Per_Bag_Freight_Charges || 0}
                onChange={(e) =>
                  handleInputChange(
                    "Per_Bag_Freight_Charges",
                    parseFloat(e.target.value) || 0,
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
                value={entry.Total_Freight_Amount || 0}
                onChange={(e) =>
                  handleInputChange(
                    "Total_Freight_Amount",
                    parseFloat(e.target.value) || 0,
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
                value={entry.No_of_Bags || 0}
                onChange={(e) =>
                  handleInputChange("No_of_Bags", parseInt(e.target.value) || 0)
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
    </div>
  );
}
