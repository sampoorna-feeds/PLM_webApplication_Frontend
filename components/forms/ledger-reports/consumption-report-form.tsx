"use client";

import { useState, useEffect } from "react";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getConsumptionReport } from "@/lib/api/services/report-ledger.service";
import { getAllLOCsFromUserSetup } from "@/lib/api/services/dimension.service";
import { LocationSelect } from "@/components/forms/shared/location-select";
import { useAuth } from "@/lib/contexts/auth-context";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";

export function ConsumptionReportForm() {
  const { userID } = useAuth();
  const [startingDate, setStartingDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endingDate, setEndingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loc, setLoc] = useState<string>("");
  const [authorizedCodes, setAuthorizedCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadAuthorizedLOCs = async () => {
      if (userID) {
        try {
          const locs = await getAllLOCsFromUserSetup(userID);
          const codes = locs.map((l) => l.Code);
          setAuthorizedCodes(codes);
          
          // Auto-select if only one location is authorized
          if (codes.length === 1) {
            setLoc(codes[0]);
          }
        } catch (error) {
          console.error("Error loading authorized locations:", error);
        }
      }
    };
    loadAuthorizedLOCs();
  }, [userID]);

  const handleFetchReport = async () => {
    if (!startingDate || !endingDate) {
      toast.error("Please select both starting and ending dates");
      return;
    }

    if (!loc) {
      toast.error("Please select a location");
      return;
    }

    setIsLoading(true);
    try {
      const base64 = await getConsumptionReport({ startingDate, endingDate, loc });
      if (!base64) {
        toast.error("No data received for the selected criteria");
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
      link.download = `Consumption_Report_${loc}_${startingDate}_to_${endingDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error fetching consumption report:", error);
      toast.error(error.message || "Failed to fetch consumption report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Consumption Report</CardTitle>
        <CardDescription>
          Generate a detailed consumption report for the selected period and location
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
          <label className="text-sm font-medium">Location Filter <span className="text-destructive">*</span></label>
          <LocationSelect 
            value={loc} 
            onChange={(val) => setLoc(val)} 
            authorizedCodes={authorizedCodes}
            placeholder="Search and select allowed location..."
          />
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
