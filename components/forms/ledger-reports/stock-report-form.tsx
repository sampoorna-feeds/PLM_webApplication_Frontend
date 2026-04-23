"use client";

import { useState, useEffect } from "react";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getStockReport } from "@/lib/api/services/report-ledger.service";
import { getTransferItemsForDialog } from "@/lib/api/services/transfer-orders.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2, FileDown, Eye } from "lucide-react";
import { toast } from "sonner";

export function StockReportForm() {
  const [startingDate, setStartingDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endingDate, setEndingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [itemNo, setItemNo] = useState<string>("");
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFetchReport = async (mode: "download" | "view") => {
    if (!startingDate || !endingDate || !itemNo) {
      toast.error("Please fill in all fields (Dates and Item No)");
      return;
    }

    setIsLoading(true);
    try {
      const base64 = await getStockReport({ startingDate, endingDate, itemNo });
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
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (mode === "view") {
        window.open(url, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = `Stock_Report_${itemNo}_${startingDate}_to_${endingDate}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Item</label>
          <SearchableSelect
            placeholder="Search and select an item..."
            value={itemNo}
            onValueChange={setItemNo}
            onSearch={fetchItems}
            options={options}
            isLoading={isSearching}
          />
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleFetchReport("view")}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            View Report
          </Button>
          <Button
            onClick={() => handleFetchReport("download")}
            disabled={isLoading}
            className="w-full sm:w-auto bg-primary text-primary-foreground shadow hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
