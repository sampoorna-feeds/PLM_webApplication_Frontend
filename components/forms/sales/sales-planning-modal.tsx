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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  getAllBranchesFromUserSetup,
  DimensionValue,
} from "@/lib/api/services/dimension.service";
import { getLocationsByBranches } from "@/lib/api/services/location.service";
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
          const branches = await getAllBranchesFromUserSetup(userID);
          const branchCodes = branches.map((b) => b.Code).filter(Boolean);
          
          if (branchCodes.length > 0) {
            const locItems = await getLocationsByBranches(branchCodes);
            const locs: DimensionValue[] = locItems.map((loc) => ({
              Code: loc.Code,
              Name: loc.Name,
            }));
            setLocations(locs);
            if (locs.length > 0) {
              setSelectedLocation(locs[0].Code);
            }
          } else {
            setLocations([]);
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
            <SearchableSelect
              value={selectedLocation}
              onValueChange={setSelectedLocation}
              disabled={isLoading || isFetchingLocations}
              isLoading={isFetchingLocations}
              options={locations.map((loc) => ({
                value: loc.Code,
                label: loc.Name ? `${loc.Code} - ${loc.Name}` : loc.Code,
              }))}
              placeholder={
                isFetchingLocations ? "Loading..." : "Select a location"
              }
              searchPlaceholder="Search location..."
              className="h-9 text-sm"
            />
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
