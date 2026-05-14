"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  getAllLOCsFromUserSetup,
  DimensionValue,
} from "@/lib/api/services/dimension.service";
import { getSalesPlanningReport } from "@/lib/api/services/sales-orders.service";
import { downloadExcelFromBase64 } from "@/lib/file-utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SalesPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SalesPlanningModal({
  isOpen,
  onClose,
}: SalesPlanningModalProps) {
  const { userID } = useAuth();
  const [locations, setLocations] = useState<DimensionValue[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLocations, setIsFetchingLocations] = useState(false);

  useEffect(() => {
    if (isOpen && userID) {
      const fetchLocations = async () => {
        setIsFetchingLocations(true);
        try {
          const locs = await getAllLOCsFromUserSetup(userID);
          setLocations(locs);
          if (locs.length > 0) {
            setSelectedLocation(locs[0].Code);
          }
        } catch (error) {
          console.error("Failed to fetch locations:", error);
          toast.error("Failed to load authorized locations");
        } finally {
          setIsFetchingLocations(false);
        }
      };
      fetchLocations();
    }
  }, [isOpen, userID]);

  const handleGenerate = async () => {
    if (!selectedLocation) {
      toast.error("Please select a location");
      return;
    }

    setIsLoading(true);
    try {
      const base64 = await getSalesPlanningReport(selectedLocation);
      if (base64) {
        downloadExcelFromBase64(base64, `SalesPlanning_${selectedLocation}`);
        toast.success("Report generated successfully");
        onClose();
      } else {
        toast.error("No report data received from server.");
      }
    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast.error(error.message || "Failed to generate sales planning report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sales Planning Report</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select Location</label>
            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
              disabled={isLoading || isFetchingLocations}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isFetchingLocations ? "Loading..." : "Select a location"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {locations.length === 0 && !isFetchingLocations ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No locations found
                  </div>
                ) : (
                  locations.map((loc) => (
                    <SelectItem key={loc.Code} value={loc.Code}>
                      {loc.Name ? `${loc.Code} - ${loc.Name}` : loc.Code}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isLoading || isFetchingLocations || !selectedLocation}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
