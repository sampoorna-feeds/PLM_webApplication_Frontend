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
  getVendorLedgerEntriesRaw,
  type VendorLedgerEntry,
} from "@/lib/api/services/vendor-ledger.service";
import { exportToExcel } from "@/lib/utils/export";
import { toast } from "sonner";
import { ALL_COLUMNS } from "@/components/forms/ledger/vendor-ledger-column-config";
import { cn } from "@/lib/utils";

interface VendorLedgerExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterString: string;
  totalRecords: number;
  visibleColumns: string[];
  humanReadableFilters: string[];
  title?: string;
  filename?: string;
  openingBalance?: number;
  closingBalance?: number;
  currentEntries?: VendorLedgerEntry[];
}

const BATCH_SIZE = 5000;

export function VendorLedgerExportDialog({
  open,
  onOpenChange,
  filterString,
  totalRecords,
  visibleColumns,
  humanReadableFilters,
  title = "Vendor Ledger",
  filename = "Vendor_Ledger",
  openingBalance,
  closingBalance,
  currentEntries = [],
}: VendorLedgerExportDialogProps) {
  const [exportMode, setExportMode] = useState<"visible" | "all">("visible");
  const [progress, setProgress] = useState(0);
  const [fetchedCount, setFetchedCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
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
    const isVisibleOnly = exportMode === "visible";
    const effectiveTotal = isVisibleOnly ? currentEntries.length : totalRecords;
    
    if (effectiveTotal === 0) {
      toast.error("No records found to export.");
      onOpenChange(false);
      return;
    }

    const expectedColumns =
      isVisibleOnly ? visibleColumns : ALL_COLUMNS.map((c) => c.id);

    try {
      let accumulatedEntries: VendorLedgerEntry[] = [];

      if (isVisibleOnly) {
        accumulatedEntries = currentEntries;
        setFetchedCount(accumulatedEntries.length);
        setProgress(100);
      } else {
        let currentSkip = 0;
        while (currentSkip < totalRecords) {
          if (!open) return;

          const result = await getVendorLedgerEntriesRaw({
            $select: expectedColumns.join(","),
            $filter: filterString,
            $top: BATCH_SIZE,
            $skip: currentSkip,
          });

          accumulatedEntries = [...accumulatedEntries, ...(result.value || [])];
          currentSkip += BATCH_SIZE;

          const newFetchedCount = Math.min(
            accumulatedEntries.length,
            totalRecords,
          );
          setFetchedCount(newFetchedCount);
          setProgress((newFetchedCount / totalRecords) * 100);
        }
      }

      exportToExcel(
        accumulatedEntries,
        expectedColumns,
        humanReadableFilters,
        filename,
        ALL_COLUMNS,
        {
          opening: openingBalance,
          closing: closingBalance,
        }
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
        className="sm:max-w-md border-border/50 bg-background/95 backdrop-blur-3xl rounded-2xl shadow-2xl overflow-hidden"
        onInteractOutside={(e) => isExporting && e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-xl font-extrabold tracking-tight">Export {title}</DialogTitle>
          <DialogDescription className="text-muted-foreground/80 font-medium">
            {isExporting
              ? "Please wait while we prepare your file. Do not close this window."
              : "Select your preferred layout for the financial data extraction."}
          </DialogDescription>
        </DialogHeader>
        {!isExporting ? (
          <div className="space-y-8 py-6">
            <div className="space-y-4">
              <div className="bg-muted/30 p-1.5 rounded-xl border border-border/40 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={exportMode === "visible" ? "default" : "ghost"}
                  className={cn(
                    "h-10 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg shadow-none",
                    exportMode === "visible" ? "bg-primary shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => setExportMode("visible")}
                >
                  Visible Columns
                </Button>
                <Button
                  type="button"
                  variant={exportMode === "all" ? "default" : "ghost"}
                  className={cn(
                    "h-10 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg shadow-none",
                    exportMode === "all" ? "bg-primary shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => setExportMode("all")}
                >
                  All Columns
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="ghost" 
                className="h-11 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStart} 
                className="h-11 px-8 gap-3 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                Start Export
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-8 py-10 animate-in fade-in zoom-in duration-500">
             <div className="relative h-20 w-20">
               <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
               <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <div className="flex-1 space-y-4 w-full">
               <div className="flex justify-between items-end mb-1 px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary italic">Processing Batch</span>
                <span className="text-[10px] font-bold text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 w-full bg-muted/30 border border-border/20 rounded-full" />
              <div className="text-muted-foreground flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
                <span>{fetchedCount.toLocaleString()} items fetched</span>
                <span>{totalRecords.toLocaleString()} System Total</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
