import { ALL_COLUMNS } from "@/components/forms/ledger/gl-entry-column-config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  getGLEntriesRaw,
  type GLEntry,
} from "@/lib/api/services/gl-entry.service";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/utils/export";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface GLEntryExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterString: string;
  searchString?: string;
  totalRecords: number;
  visibleColumns: string[];
  currentEntries?: GLEntry[];
  openingBalance?: number;
  closingBalance?: number;
}

const BATCH_SIZE = 5000;

export function GLEntryExportDialog({
  open,
  onOpenChange,
  filterString,
  searchString,
  totalRecords,
  visibleColumns,
  currentEntries = [],
  openingBalance,
  closingBalance,
}: GLEntryExportDialogProps) {
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
    // If 'visible' is selected, we export currently displayed items ONLY (as per user request)
    // If 'all' is selected, we fetch everything from the server
    const isVisibleOnly = exportMode === "visible";
    const effectiveTotal = isVisibleOnly ? currentEntries.length : totalRecords;

    if (effectiveTotal === 0) {
      toast.error("No records found to export.");
      onOpenChange(false);
      return;
    }

    const expectedColumns = isVisibleOnly
      ? visibleColumns
      : ALL_COLUMNS.map((c) => c.id);

    try {
      let accumulatedEntries: GLEntry[] = [];

      if (isVisibleOnly) {
        accumulatedEntries = currentEntries;
        setFetchedCount(accumulatedEntries.length);
        setProgress(100);
      } else {
        let currentSkip = 0;
        while (currentSkip < totalRecords) {
          if (!open) return;

          const result = await getGLEntriesRaw({
            $select: expectedColumns.join(","),
            $filter: filterString,
            $search: searchString,
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
        ["GL Entry Report"],
        "GL_Entry_Export",
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
      toast.error("Failed to export GL records. Please try again.");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isExporting ? undefined : onOpenChange}>
      <DialogContent
        className="border-border/50 bg-background/95 overflow-hidden rounded-2xl shadow-2xl backdrop-blur-3xl sm:max-w-md"
        onInteractOutside={(e) => isExporting && e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-xl font-extrabold tracking-tight">
            Financial Export: GL Entry
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80 font-medium">
            {isExporting
              ? "Preparing your encrypted financial export. Please remain on this screen."
              : "Select your preferred layout for the general ledger data extraction."}
          </DialogDescription>
        </DialogHeader>
        {!isExporting ? (
          <div className="space-y-8 py-6">
            <div className="space-y-4">
              <div className="bg-muted/30 border-border/40 grid grid-cols-2 gap-2 rounded-xl border p-1.5">
                <Button
                  type="button"
                  variant={exportMode === "visible" ? "default" : "ghost"}
                  className={cn(
                    "h-10 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-none transition-all",
                    exportMode === "visible"
                      ? "bg-primary shadow-primary/20 shadow-lg"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                  onClick={() => setExportMode("visible")}
                >
                  Visible Columns
                </Button>
                <Button
                  type="button"
                  variant={exportMode === "all" ? "default" : "ghost"}
                  className={cn(
                    "h-10 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-none transition-all",
                    exportMode === "all"
                      ? "bg-primary shadow-primary/20 shadow-lg"
                      : "text-muted-foreground hover:bg-muted",
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
                className="text-muted-foreground hover:bg-muted h-11 rounded-xl px-6 text-[10px] font-black tracking-widest uppercase transition-all"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStart}
                className="shadow-primary/20 h-11 gap-3 rounded-xl px-8 text-[10px] font-black tracking-widest uppercase shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                Initialize Export
              </Button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in flex flex-col items-center justify-center space-y-8 py-10 duration-500">
            <div className="relative h-20 w-20">
              <div className="border-primary/10 absolute inset-0 rounded-full border-4" />
              <div className="border-primary absolute inset-0 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
            <div className="w-full space-y-4">
              <div className="mb-1 flex items-end justify-between px-1">
                <span className="text-primary text-[10px] font-extrabold tracking-widest uppercase italic">
                  Syncing Ledger
                </span>
                <span className="text-muted-foreground text-[10px] font-bold">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress
                value={progress}
                className="bg-muted/30 border-border/20 h-2 w-full rounded-full border"
              />
              <div className="text-muted-foreground/60 flex justify-between text-[10px] font-bold tracking-widest uppercase">
                <span>{fetchedCount.toLocaleString()} Entries Buffer</span>
                <span>{totalRecords.toLocaleString()} System Total</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
