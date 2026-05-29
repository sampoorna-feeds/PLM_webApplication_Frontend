"use client";

import { useState, useEffect } from "react";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getItemAvailabilityReport } from "@/lib/api/services/report-ledger.service";
import { getTransferItemsForDialog } from "@/lib/api/services/transfer-orders.service";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { Loader2, FileDown, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";
import { getLocationsByBranches } from "@/lib/api/services/location.service";

export function ItemAvailabilityForm() {
  const { userID } = useAuth();
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [itemNo, setItemNo] = useState<string>("");
  const [loc, setLoc] = useState<string>("");
  const [itemOptions, setItemOptions] = useState<SearchableSelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SearchableSelectOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [branches, setBranches] = useState<string>("");
  const [isSetupLoading, setIsSetupLoading] = useState(true);

  const fetchItems = async (search: string) => {
    setIsSearching(true);
    try {
      const res = await getTransferItemsForDialog({
        skip: 0,
        top: 20,
        search,
      });
      const newOptions = res.value.map(item => ({
        value: item.No,
        label: `${item.No} - ${item.Description || ""}`
      }));
      setItemOptions(newOptions);
      return newOptions;
    } catch (error) {
      console.error("Error fetching items:", error);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Load items, branches, and locations
  useEffect(() => {
    fetchItems("");

    const loadUserSetup = async () => {
      if (userID) {
        setIsSetupLoading(true);
        try {
          // Fetch branches
          const userBranches = await getAllBranchesFromUserSetup(userID.toString());
          const branchCodes = userBranches.map((b) => b.Code).filter(Boolean);
          setBranches(branchCodes.join("|"));

          // Fetch locations for these branches
          const locationsList = await getLocationsByBranches(branchCodes);
          const locOptions = locationsList.map(loc => ({
            value: loc.Code,
            label: `${loc.Code} - ${loc.Name || ""}`,
            description: loc.City ? `City: ${loc.City}` : undefined
          }));
          setLocationOptions(locOptions);
        } catch (error) {
          console.error("Error loading user setup:", error);
        } finally {
          setIsSetupLoading(false);
        }
      }
    };
    loadUserSetup();
  }, [userID]);

  const handleFetchReport = async () => {
    if (!endDate) {
      toastError(new Error("Please select an end date"));
      return;
    }

    if (!branches) {
      toastError(new Error("No authorized branches found for your user account"));
      return;
    }

    setIsLoading(true);
    try {
      const base64 = await getItemAvailabilityReport({
        endDate,
        locationCode: loc || undefined,
        itemNo: itemNo || undefined,
        branch: branches,
        userID: userID?.toString() || "Suman",
      });

      if (!base64) {
        toastError(new Error("No data received for the selected parameters"));
        return;
      }

      const byteCharacters = atob(base64.replace(/\s/g, ""));
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      const fileNameSuffix = itemNo ? `_${itemNo.replace(/\|/g, "_")}` : "";
      const locSuffix = loc ? `_${loc.replace(/\|/g, "_")}` : "";
      link.download = `Item_Availability${fileNameSuffix}${locSuffix}_AsOf_${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Successfully generated Item Availability Report.");
    } catch (error: any) {
      console.error("Error fetching item availability report:", error);
      toastError(error, "Failed to fetch item availability report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Item Availability Report</CardTitle>
        <CardDescription>
          Generate a spreadsheet showing real-time item availability status across your locations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isSetupLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading authorization setup...</span>
          </div>
        ) : (
          <>
            {!branches && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>You do not have any branches assigned in Web User Setup. You will not be able to fetch reports.</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">As of Date <span className="text-destructive">*</span></label>
              <DateInput value={endDate} onChange={setEndDate} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Locations (Optional)</label>
                <SearchableSelect
                  placeholder="Select locations (or leave blank for all)"
                  value={loc}
                  onValueChange={(v) => setLoc(v)}
                  options={locationOptions}
                  isLoading={isSetupLoading}
                  isMulti={true}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Item (Optional)</label>
                <SearchableSelect
                  placeholder="Select an item (or leave blank for all)"
                  value={itemNo}
                  onValueChange={setItemNo}
                  onSearch={fetchItems}
                  options={itemOptions}
                  isLoading={isSearching}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleFetchReport}
                disabled={isLoading || !branches}
                className="w-full sm:w-auto bg-primary text-primary-foreground shadow hover:bg-primary/90"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                Download Excel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ItemAvailabilityForm;
