"use client";

import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import { DimensionSelect } from "@/components/forms/dimension-select";
import { LocationSelect } from "@/components/forms/shared/location-select";
import { ItemSelect } from "@/components/forms/transfer-orders/item-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createConsumeInventoryEntry,
  deleteConsumeInventoryEntry,
  getConsumptionPostingSetup,
  getNextDocumentNo,
  postConsumeInventory,
  type ConsumeInventoryEntry,
  type ConsumptionPostingSetup,
} from "@/lib/api/services/consume-inventory.service";
import {
  getItemLedgerEntries,
  type ItemLedgerEntry,
} from "@/lib/api/services/report-ledger.service";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  Loader2,
  Package,
  Search,
  Send,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { getWebUser, type WebUser } from "@/lib/api/services/web-user.service";
import { isPostingDateValid } from "@/lib/utils/posting-date";
import { LedgerEntryModal } from "./ledger-entry-modal";

export function ConsumeInventoryForm() {
  const { userID } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [consumptionOptions, setConsumptionOptions] = useState<
    ConsumptionPostingSetup[]
  >([]);
  const [fetchingOptions, setFetchingOptions] = useState(false);
  const [formState, setFormState] = useState<Partial<ConsumeInventoryEntry>>({
    "Posting Date": new Date().toISOString().split("T")[0],
    "Entry Type": "Issue",
    "Item No.": "",
    Consumption: true,
    Consumption_Posting: "",
    Description: "",
    "Location Code": "",
    Quantity: 0,
    "Unit of Measure Code": "",
    "Lob Code": "",
    "Branch Code": "",
    "Employee Code": "",
    "Assignment Code": "",
    "Applies-to Entry": undefined,
    "Applies-from Entry": undefined,
    Gen_Prod_Posting_Group: "",
  });

  const [applyToEntries, setApplyToEntries] = useState<ItemLedgerEntry[]>([]);
  const [applyFromEntries, setApplyFromEntries] = useState<ItemLedgerEntry[]>(
    [],
  );
  const [loadingApplyTo, setLoadingApplyTo] = useState(false);
  const [loadingApplyFrom, setLoadingApplyFrom] = useState(false);
  const [isApplyToModalOpen, setIsApplyToModalOpen] = useState(false);
  const [isApplyFromModalOpen, setIsApplyFromModalOpen] = useState(false);
  const [webUserProfile, setWebUserProfile] = useState<WebUser | null>(null);

  useEffect(() => {
    const loadContext = async () => {
      if (userID) {
        try {
          const profile = await getWebUser(userID);
          setWebUserProfile(profile);
        } catch (err) {
          console.error("Error loading web user profile:", err);
        }
      }
    };
    loadContext();
  }, [userID]);

  useEffect(() => {
    const fetchOptions = async () => {
      const itemNo = (formState["Item No."] || "").trim();
      if (itemNo) {
        setFetchingOptions(true);
        try {
          const options = await getConsumptionPostingSetup(itemNo);
          setConsumptionOptions(options);
          // If only one option, auto-select it
          if (options.length === 1) {
            setFormState((prev) => ({
              ...prev,
              "Consumption Posting": options[0].Posting_Group,
            }));
          }
        } catch (error) {
          console.error("Error fetching consumption options:", error);
        } finally {
          setFetchingOptions(false);
        }
      } else {
        setConsumptionOptions([]);
      }
    };
    fetchOptions();
  }, [formState["Item No."]]);

  useEffect(() => {
    const fetchApplyToEntries = async () => {
      const itemNo = formState["Item No."];
      if (!itemNo) {
        setApplyToEntries([]);
        return;
      }
      setLoadingApplyTo(true);
      try {
        const { entries } = await getItemLedgerEntries({
          $filter: `Item_No eq '${itemNo.replace(/'/g, "''")}' and Open eq true`,
          $top: 100,
        });
        setApplyToEntries(entries);
      } catch (err) {
        console.error("Error fetching apply-to entries:", err);
      } finally {
        setLoadingApplyTo(false);
      }
    };

    fetchApplyToEntries();
  }, [formState["Item No."]]);

  useEffect(() => {
    const fetchApplyFromEntries = async () => {
      const itemNo = formState["Item No."];
      if (!itemNo) {
        setApplyFromEntries([]);
        return;
      }
      setLoadingApplyFrom(true);
      try {
        const { entries } = await getItemLedgerEntries({
          $filter: `Item_No eq '${itemNo.replace(/'/g, "''")}' and Positive eq false and Consumption eq true`,
          $top: 100,
        });
        setApplyFromEntries(entries);
      } catch (err) {
        console.error("Error fetching apply-from entries:", err);
      } finally {
        setLoadingApplyFrom(false);
      }
    };

    fetchApplyFromEntries();
  }, [formState["Item No."]]);

  const handleChange = (field: keyof ConsumeInventoryEntry, value: any) => {
    setFormState((prev) => {
      const next = { ...prev, [field]: value };

      // If Entry Type changes, clear incompatible application fields
      if (field === "Entry Type") {
        if (value === "Issue") {
          next["Applies-from Entry"] = undefined;
        } else if (value === "Return") {
          next["Applies-to Entry"] = undefined;
        }
      }

      // Reset dependent fields
      if (field === "Lob Code") {
        next["Branch Code"] = "";
        next["Location Code"] = "";
      } else if (field === "Branch Code") {
        next["Location Code"] = "";
      }

      return next;
    });
  };

  const handlePostDirectly = async () => {
    if (
      !formState["Item No."] ||
      !formState["Location Code"] ||
      !formState.Quantity
    ) {
      toastError(new Error("Please fill in Item, Location and Quantity"));
      return;
    }

    const postingDate = formState["Posting Date"] || new Date().toISOString().split("T")[0];
    if (!isPostingDateValid(postingDate, webUserProfile)) return;

    setSubmitting(true);
    let createdEntry: ConsumeInventoryEntry | null = null;

    try {
      // 1. Generate unique Document No sequentially to ensure number series integrity
      let generatedDocNo = "";
      try {
        generatedDocNo = await getNextDocumentNo(postingDate);
      } catch (error) {
        console.error("Error generating Doc No:", error);
        throw new Error("Failed to generate Document No");
      }

      const entryToInsert = {
        ...formState,
        "Document No.": generatedDocNo,
        UserID: userID,
      } as ConsumeInventoryEntry;

      // 2. Insert the entry to NAV/BC
      createdEntry = await createConsumeInventoryEntry(entryToInsert);

      // 3. Post the entry in ERP
      try {
        const result = await postConsumeInventory(userID!);
        toast.success(result || "Posted successfully");

        // Clear only non-persistent fields
        setFormState((prev) => ({
          ...prev,
          "Item No.": "",
          Description: "",
          Quantity: 0,
          "Unit of Measure Code": "",
          "Applies-to Entry": undefined,
          "Applies-from Entry": undefined,
          Gen_Prod_Posting_Group: "",
        }));
      } catch (postError: any) {
        console.error("Posting failed, rolling back entry...", postError);
        toastError(postError, "Posting failed. Rolling back...");
        
        // Rollback: Delete the entry we just created
        if (createdEntry) {
          try {
            await deleteConsumeInventoryEntry(createdEntry);
          } catch (delError) {
            console.error(`Failed to delete entry Line_No ${createdEntry.Line_No}:`, delError);
          }
        }
        throw postError;
      }
    } catch (error: any) {
      toastError(error, "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="from-background via-background to-primary/5 border-primary/10 overflow-hidden border border-none bg-gradient-to-br shadow-2xl">
        <div className="from-primary/20 via-primary to-primary/20 absolute top-0 left-0 h-1 w-full bg-gradient-to-r" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Package className="text-primary h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  New Consumption Entry
                </CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                  Enter consumption details to directly post to the ERP
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {submitting && (
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary animate-pulse border-none"
                >
                  Posting...
                </Badge>
              )}
              <Button
                onClick={handlePostDirectly}
                disabled={submitting}
                className="font-bold"
                size="sm"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Post Consumption
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-7">
            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Posting Date
              </label>
              <DateInput
                value={formState["Posting Date"]}
                onChange={(v) => handleChange("Posting Date", v)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Entry Type
              </label>
              <div className="group relative">
                <Select
                  value={formState["Entry Type"]}
                  onValueChange={(v) => handleChange("Entry Type", v)}
                >
                  <SelectTrigger className="h-10 w-full pr-8 shadow-sm transition-all focus:ring-1">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Issue">Issue</SelectItem>
                    <SelectItem value="Return">Return</SelectItem>
                  </SelectContent>
                </Select>
                {formState["Entry Type"] && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleChange("Entry Type", "");
                    }}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-1/2 right-11 -translate-y-1/2 rounded-full p-1 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                LOB
              </label>
              <CascadingDimensionSelect
                dimensionType="LOB"
                value={formState["Lob Code"] || ""}
                onChange={(v) => handleChange("Lob Code", v)}
                userId={userID ?? undefined}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Branch
              </label>
              <CascadingDimensionSelect
                dimensionType="BRANCH"
                value={formState["Branch Code"] || ""}
                onChange={(v) => handleChange("Branch Code", v)}
                lobValue={formState["Lob Code"]}
                userId={userID ?? undefined}
                className="h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Location
              </label>
              <LocationSelect
                value={formState["Location Code"] || ""}
                onChange={(v) => handleChange("Location Code", v)}
                className="h-10"
                branchCode={formState["Branch Code"]}
                disabled={!formState["Lob Code"] || !formState["Branch Code"]}
                placeholder={
                  !formState["Branch Code"]
                    ? "Select Branch first"
                    : "Select Location"
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Item Selection
              </label>
              <ItemSelect
                value={formState["Item No."] || ""}
                onChange={(v, item) => {
                  setFormState((prev) => ({
                    ...prev,
                    "Item No.": v,
                    Description: item?.Description || "",
                    "Unit of Measure Code": item?.Base_Unit_of_Measure || "",
                    Gen_Prod_Posting_Group: (item as any)?.Gen_Prod_Posting_Group || "",
                    "Applies-to Entry": undefined,
                    "Applies-from Entry": undefined,
                  }));
                }}
                className="h-10"
                locationCode={formState["Location Code"]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Description <span className="text-red-500">*</span>
              </label>
              <Input
                className="h-10 shadow-sm focus:ring-1"
                value={formState.Description || ""}
                onChange={(e) => handleChange("Description", e.target.value)}
                placeholder="Enter description"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Quantity
              </label>
              <Input
                type="number"
                className="text-primary h-10 font-mono text-lg font-bold shadow-sm focus:ring-1"
                value={formState.Quantity}
                onChange={(e) =>
                  handleChange("Quantity", parseFloat(e.target.value) || 0)
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Consumption Posting
              </label>
              <div className="group relative">
                <Select
                  value={formState["Consumption Posting"] || "none"}
                  onValueChange={(v) =>
                    handleChange("Consumption Posting", v === "none" ? "" : v)
                  }
                  disabled={fetchingOptions}
                >
                  <SelectTrigger className="h-10 pr-8 shadow-sm focus:ring-1">
                    <SelectValue
                      placeholder={
                        fetchingOptions
                          ? "Loading..."
                          : !formState["Item No."]
                            ? "Select Item first"
                            : consumptionOptions.length === 0
                              ? "No options found"
                              : "Select Type"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {!formState["Item No."] && (
                      <div className="text-muted-foreground px-2 py-4 text-center text-[10px] italic">
                        Please select an item first
                      </div>
                    )}
                    {consumptionOptions.map((opt, i) => (
                      <SelectItem key={i} value={opt.Posting_Group}>
                        <div className="flex flex-col">
                          <span className="font-bold">{opt.Posting_Group}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {opt.Name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formState["Consumption Posting"] && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleChange("Consumption Posting", "");
                    }}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-1/2 right-11 -translate-y-1/2 rounded-full p-1 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider text-blue-400 uppercase">
                Apply to Entry
              </label>
              <div className="group relative">
                <Input
                  className="bg-muted/30 h-10 cursor-pointer border-dashed pr-10 font-medium"
                  value={formState["Applies-to Entry"] || ""}
                  placeholder={
                    !formState["Item No."]
                      ? "Select Item first"
                      : formState["Entry Type"] !== "Issue"
                        ? "Enabled for Issue only"
                        : "Click to select"
                  }
                  readOnly
                  onClick={() =>
                    formState["Item No."] && 
                    formState["Entry Type"] === "Issue" && 
                    setIsApplyToModalOpen(true)
                  }
                  disabled={!formState["Item No."] || formState["Entry Type"] !== "Issue"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary absolute top-0 right-0 h-10 w-10"
                  onClick={() =>
                    formState["Item No."] && 
                    formState["Entry Type"] === "Issue" && 
                    setIsApplyToModalOpen(true)
                  }
                  disabled={!formState["Item No."] || formState["Entry Type"] !== "Issue"}
                >
                  <Search className="h-4 w-4" />
                </Button>
                {formState["Applies-to Entry"] && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChange("Applies-to Entry", undefined);
                    }}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-9 -translate-y-1/2 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider text-green-400 uppercase">
                Apply From Entry
              </label>
              <div className="group relative">
                <Input
                  className="bg-muted/30 h-10 cursor-pointer border-dashed pr-10 font-medium"
                  value={formState["Applies-from Entry"] || ""}
                  placeholder={
                    !formState["Item No."]
                      ? "Select Item first"
                      : formState["Entry Type"] !== "Return"
                        ? "Enabled for Return only"
                        : "Click to select"
                  }
                  readOnly
                  onClick={() =>
                    formState["Item No."] && 
                    formState["Entry Type"] === "Return" && 
                    setIsApplyFromModalOpen(true)
                  }
                  disabled={!formState["Item No."] || formState["Entry Type"] !== "Return"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary absolute top-0 right-0 h-10 w-10"
                  onClick={() =>
                    formState["Item No."] && 
                    formState["Entry Type"] === "Return" && 
                    setIsApplyFromModalOpen(true)
                  }
                  disabled={!formState["Item No."] || formState["Entry Type"] !== "Return"}
                >
                  <Search className="h-4 w-4" />
                </Button>
                {formState["Applies-from Entry"] && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChange("Applies-from Entry", undefined);
                    }}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-9 -translate-y-1/2 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                UOM
              </label>
              <Input
                className="bg-muted/50 h-10 border-dashed font-medium"
                value={formState["Unit of Measure Code"]}
                disabled
                placeholder="Auto-filled"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Employee
              </label>
              <DimensionSelect
                dimensionType="EMPLOYEE"
                value={formState["Employee Code"] || ""}
                onChange={(v) => handleChange("Employee Code", v)}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Assignment
              </label>
              <DimensionSelect
                dimensionType="ASSIGNMENT"
                value={formState["Assignment Code"] || ""}
                onChange={(v) => handleChange("Assignment Code", v)}
                className="h-10"
              />
            </div>
          </div>

          <LedgerEntryModal
            isOpen={isApplyToModalOpen}
            onClose={() => setIsApplyToModalOpen(false)}
            entries={applyToEntries}
            onSelect={(entry) =>
              handleChange("Applies-to Entry", entry.Entry_No)
            }
            title={`Select Apply-to Entry for ${formState["Item No."]}`}
            isLoading={loadingApplyTo}
          />

          <LedgerEntryModal
            isOpen={isApplyFromModalOpen}
            onClose={() => setIsApplyFromModalOpen(false)}
            entries={applyFromEntries}
            onSelect={(entry) =>
              handleChange("Applies-from Entry", entry.Entry_No)
            }
            title={`Select Apply-from Entry for ${formState["Item No."]}`}
            isLoading={loadingApplyFrom}
          />
        </CardContent>
      </Card>
    </div>
  );
}
