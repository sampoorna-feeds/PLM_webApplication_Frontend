import { useState, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  getItemLedgerEntries,
  type ItemLedgerEntry,
} from "@/lib/api/services/report-ledger.service";
import { exportToExcel } from "@/lib/utils/export";
import { toast } from "sonner";
import { buildSelectQuery, ALL_COLUMNS } from "./column-config";

interface ExportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // State from parent table containing pre-built OData parts
  filterString: string;
  totalRecords: number;
  visibleColumns: string[];
  humanReadableFilters: string[];
}

const BATCH_SIZE = 10000;

export function ExportProgressDialog({
  open,
  onOpenChange,
  filterString,
  totalRecords,
  visibleColumns,
  humanReadableFilters,
}: ExportProgressDialogProps) {
  const [exportMode, setExportMode] = useState<"visible" | "all">("visible");
  const [progress, setProgress] = useState(0);
  const [fetchedCount, setFetchedCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Reset state when dialog is opened
    if (open) {
      setExportMode("visible");
      setProgress(0);
      setFetchedCount(0);
      setIsExporting(false);
    }
  }, [open]);

  const handleStart = () => {
    setIsExporting(true);
    startExportProcess();
  };

  const startExportProcess = async () => {
    if (totalRecords === 0) {
      toast.error("No records to export.");
      onOpenChange(false);
      return;
    }

    const expectedColumns =
      exportMode === "visible" ? visibleColumns : ALL_COLUMNS.map((c) => c.id);

    try {
      let accumulatedEntries: ItemLedgerEntry[] = [];
      let currentSkip = 0;

      // Loop until we have fetched all expected records
      while (currentSkip < totalRecords) {
        // Stop if dialog was closed or component unmounted
        if (!open) return;

        const result = await getItemLedgerEntries({
          $select: buildSelectQuery(expectedColumns),
          $filter: filterString,
          $top: BATCH_SIZE,
          $skip: currentSkip,
        });

        accumulatedEntries = [...accumulatedEntries, ...result.entries];
        currentSkip += BATCH_SIZE;

        const newFetchedCount = Math.min(
          accumulatedEntries.length,
          totalRecords,
        );
        setFetchedCount(newFetchedCount);
        setProgress((newFetchedCount / totalRecords) * 100);
      }

      // Finish export
      exportToExcel(
        accumulatedEntries,
        expectedColumns,
        humanReadableFilters,
        "Report_Ledger",
      );
      toast.success(
        `Successfully exported ${accumulatedEntries.length} records.`,
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export records. Please try again.");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isExporting ? undefined : onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => isExporting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Export to Excel</DialogTitle>
          <DialogDescription>
            {isExporting
              ? "Please wait while we prepare your file. Do not close this window."
              : "Configure your export settings before downloading."}
          </DialogDescription>
        </DialogHeader>
        {!isExporting ? (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <span className="text-sm font-medium">Columns to Export</span>
              <div className="bg-muted/50 flex w-full items-center rounded-md border p-1">
                <Button
                  type="button"
                  variant={exportMode === "visible" ? "secondary" : "ghost"}
                  className="h-8 w-1/2 justify-center shadow-none"
                  onClick={() => setExportMode("visible")}
                >
                  Visible Columns
                </Button>
                <Button
                  type="button"
                  variant={exportMode === "all" ? "secondary" : "ghost"}
                  className="h-8 w-1/2 justify-center shadow-none"
                  onClick={() => setExportMode("all")}
                >
                  All Columns
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleStart} className="gap-2">
                <Download className="h-4 w-4" />
                Start Export
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="flex w-full items-center gap-4">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
              <div className="flex-1 space-y-2">
                <Progress value={progress} className="h-2 w-full" />
                <div className="text-muted-foreground flex justify-between text-xs">
                  <span>{fetchedCount.toLocaleString()} items fetched</span>
                  <span>{totalRecords.toLocaleString()} total</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
