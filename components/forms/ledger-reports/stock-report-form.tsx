"use client";

import { useState, useEffect } from "react";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getStockReport } from "@/lib/api/services/report-ledger.service";
import { getTransferItemsForDialog } from "@/lib/api/services/transfer-orders.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { LocationSelect } from "@/components/forms/shared/location-select";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";

export function StockReportForm() {
  const [startingDate, setStartingDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endingDate, setEndingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [itemNo, setItemNo] = useState<string>("");
  const [loc, setLoc] = useState<string>("");
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFetchReport = async () => {
    if (!startingDate || !endingDate || !loc) {
      toast.error("Please fill in both dates and select a location");
      return;
    }

    setIsLoading(true);
    try {
      const base64 = await getStockReport({ startingDate, endingDate, itemNo, loc });
      if (!base64) {
        toast.error("No data received for the selected parameters");
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
      const fileNameSuffix = itemNo ? `_${itemNo}` : "";
      link.download = `Stock_Report${fileNameSuffix}_${startingDate}_to_${endingDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error fetching stock report:", error);
      toast.error(error.message || "Failed to fetch stock report");
    } finally {
      setIsLoading(false);
    }
  };

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
      setOptions(newOptions);
      return newOptions;
    } catch (error) {
      console.error("Error fetching items:", error);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger initial fetch
  useEffect(() => {
    fetchItems("");
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Stock Report</CardTitle>
        <CardDescription>
          Generate a stock balance report for a specific item over a period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Starting Date</label>
            <DateInput value={startingDate} onChange={setStartingDate} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ending Date</label>
            <DateInput value={endingDate} onChange={setEndingDate} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Item (Optional)</label>
            <SearchableSelect
              placeholder="Search and select an item..."
              value={itemNo}
              onValueChange={setItemNo}
              onSearch={fetchItems}
              options={options}
              isLoading={isSearching}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <LocationSelect
              value={loc}
              onChange={(v) => setLoc(v)}
              placeholder="Search and select a location..."
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleFetchReport}
            disabled={isLoading}
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
      </CardContent>
    </Card>
  );
}
