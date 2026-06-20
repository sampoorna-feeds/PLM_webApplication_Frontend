"use client";

import { useState, useEffect } from "react";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getItemAvailabilityReport,
  getInventoryAgeingReport,
} from "@/lib/api/services/report-ledger.service";
import { getTransferItemsForDialog } from "@/lib/api/services/transfer-orders.service";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileDown, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { getAllBranchesFromUserSetup } from "@/lib/api/services/dimension.service";
import { getLocationsByBranch } from "@/lib/api/services/location.service";

type ReportType = "availability" | "ageing";

export function ReportsForm() {
  const { userID } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("availability");
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [itemNo, setItemNo] = useState<string>("");
  const [loc, setLoc] = useState<string>("");
  
  // Inventory Ageing specific parameters
  const [period, setPeriod] = useState<number>(10);
  const [columnLength, setColumnLength] = useState<string>("90D");

  const [itemOptions, setItemOptions] = useState<SearchableSelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SearchableSelectOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Branch selection states
  const [branchOptions, setBranchOptions] = useState<SearchableSelectOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  const [isSetupLoading, setIsSetupLoading] = useState(true);
  const [isLocationsLoading, setIsLocationsLoading] = useState(false);

  // Reset inputs when reportType changes to avoid incorrect/invalid values carried over
  useEffect(() => {
    setLoc("");
    setItemNo("");
  }, [reportType]);

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

  // Load items and branches
  useEffect(() => {
    fetchItems("");

    const loadUserSetup = async () => {
      if (userID) {
        setIsSetupLoading(true);
        try {
          // Fetch branches
          const userBranches = await getAllBranchesFromUserSetup(userID.toString());
          const options = userBranches.map((b) => ({
            value: b.Code,
            label: b.Name ? `${b.Code} - ${b.Name}` : b.Code,
          }));
          setBranchOptions(options);

          // Pre-select first branch if available
          if (options.length > 0) {
            setSelectedBranch(options[0].value);
          }
        } catch (error) {
          console.error("Error loading user setup:", error);
        } finally {
          setIsSetupLoading(false);
        }
      }
    };
    loadUserSetup();
  }, [userID]);

  // Load locations dynamically based on selected branch
  useEffect(() => {
    const loadLocations = async () => {
      if (!selectedBranch) {
        setLocationOptions([]);
        setLoc("");
        return;
      }

      setIsLocationsLoading(true);
      try {
        const locationsList = await getLocationsByBranch(selectedBranch);
        const locOptions = locationsList.map((loc) => ({
          value: loc.Code,
          label: `${loc.Code} - ${loc.Name || ""}`,
          description: loc.City ? `City: ${loc.City}` : undefined,
        }));
        setLocationOptions(locOptions);
        setLoc(""); // Reset location selection when branch changes
      } catch (error) {
        console.error("Error loading locations for branch:", error);
      } finally {
        setIsLocationsLoading(false);
      }
    };

    loadLocations();
  }, [selectedBranch]);

  const handleFetchReport = async () => {
    if (!endDate) {
      toastError(new Error("Please select a date"));
      return;
    }

    if (!selectedBranch) {
      toastError(new Error("Please select a branch"));
      return;
    }

    setIsLoading(true);
    try {
      let base64 = "";
      let fileName = "";
      
      const fileNameSuffix = itemNo ? `_${itemNo.replace(/\|/g, "_")}` : "";
      const locSuffix = loc ? `_${loc.replace(/\|/g, "_")}` : "";

      if (reportType === "availability") {
        base64 = await getItemAvailabilityReport({
          endDate,
          locationCode: loc || undefined,
          itemNo: itemNo || undefined,
          branch: selectedBranch,
          userID: userID?.toString() || "Suman",
        });
        fileName = `Item_Availability${fileNameSuffix}${locSuffix}_AsOf_${endDate}.xlsx`;
      } else {
        if (period === undefined || period === null) {
          toastError(new Error("Please enter a period value"));
          setIsLoading(false);
          return;
        }
        if (!columnLength) {
          toastError(new Error("Please enter a column length"));
          setIsLoading(false);
          return;
        }

        base64 = await getInventoryAgeingReport({
          asondate: endDate,
          itemNo: itemNo || "",
          period,
          columnLength,
          locationFilter: loc || "",
        });
        fileName = `Inventory_Ageing${fileNameSuffix}${locSuffix}_AsOf_${endDate}.xlsx`;
      }

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
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      const successMessage = reportType === "availability" 
        ? "Successfully generated Item Availability Report."
        : "Successfully generated Inventory Ageing Report.";
      toast.success(successMessage);
    } catch (error: any) {
      console.error(`Error fetching report (${reportType}):`, error);
      const failMessage = reportType === "availability" 
        ? "Failed to fetch item availability report"
        : "Failed to fetch inventory ageing report";
      toastError(error, failMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">
          {reportType === "availability" ? "Item Availability Report" : "Inventory Ageing Report"}
        </CardTitle>
        <CardDescription>
          {reportType === "availability"
            ? "Generate a spreadsheet showing real-time item availability status across your locations"
            : "Generate a spreadsheet showing inventory ageing details by location and item"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isSetupLoading && branchOptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading authorization setup...</span>
          </div>
        ) : (
          <>
            {branchOptions.length === 0 && !isSetupLoading && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>You do not have any branches assigned in Web User Setup. You will not be able to fetch reports.</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Report Option <span className="text-destructive">*</span>
                </label>
                <Select
                  value={reportType}
                  onValueChange={(v) => setReportType(v as ReportType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a report option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="availability">Item Availability Report</SelectItem>
                    <SelectItem value="ageing">Inventory Ageing report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    As of Date <span className="text-destructive">*</span>
                  </label>
                  <DateInput value={endDate} onChange={setEndDate} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Branch <span className="text-destructive">*</span>
                  </label>
                  <SearchableSelect
                    placeholder="Select a branch"
                    value={selectedBranch}
                    onValueChange={(v) => setSelectedBranch(v)}
                    options={branchOptions}
                    isLoading={isSetupLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Location {reportType === "availability" ? "(Optional)" : "(Optional)"}
                  </label>
                  <SearchableSelect
                    placeholder={
                      selectedBranch
                        ? reportType === "availability"
                          ? "Select locations (or leave blank for all)"
                          : "Select location (or leave blank for all)"
                        : "Select a branch first"
                    }
                    value={loc}
                    onValueChange={(v) => setLoc(v)}
                    options={locationOptions}
                    isLoading={isLocationsLoading}
                    disabled={!selectedBranch || isLocationsLoading}
                    isMulti={reportType === "availability"}
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

                {reportType === "ageing" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Period (Days) <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={period}
                        onChange={(e) => setPeriod(Number(e.target.value))}
                        placeholder="Enter period (e.g. 10)"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Column Length <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="text"
                        value={columnLength}
                        onChange={(e) => setColumnLength(e.target.value)}
                        placeholder="Enter column length (e.g. 90D)"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleFetchReport}
                disabled={isLoading || !selectedBranch}
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

export default ReportsForm;
