"use client";

/**
 * Purchase Copy Document Dialog
 *
 * Two-step dialog:
 *   Step 1 — Select a "from" document type from a dropdown.
 *   Step 2 — Pick a specific document from a table, then confirm.
 *
 * Props:
 *   open           — controls dialog visibility
 *   toDocNo        — the already-created document number to copy INTO
 *   toDocType      — the target document type ("Invoice" | "Credit Memo" | "Return Order")
 *   onOpenChange   — called when dialog should open/close
 *   onSuccess      — called after a successful copy
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2, ChevronLeft, Copy } from "lucide-react";
import {
  COPY_FROM_DOC_TYPE_OPTIONS,
  fetchSourceDocumentsForCopy,
  executePurchaseCopyDocument,
  type PurchaseCopyFromDocType,
  type PurchaseCopyToDocType,
  type SourceDocumentRow,
} from "@/lib/api/services/purchase-copy-document.service";
import { cn } from "@/lib/utils";

interface PurchaseCopyDocumentDialogProps {
  open: boolean;
  toDocNo: string;
  toDocType: PurchaseCopyToDocType;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PurchaseCopyDocumentDialog({
  open,
  toDocNo,
  toDocType,
  onOpenChange,
  onSuccess,
}: PurchaseCopyDocumentDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fromDocType, setFromDocType] = useState<PurchaseCopyFromDocType | "">("");
  const [docs, setDocs] = useState<SourceDocumentRow[]>([]);
  const [isFetchingDocs, setIsFetchingDocs] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedDocNo, setSelectedDocNo] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const fromDocOptions =
    COPY_FROM_DOC_TYPE_OPTIONS[toDocType] ?? [];

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setFromDocType("");
      setDocs([]);
      setFetchError(null);
      setSelectedDocNo(null);
      setCopyError(null);
    }
  }, [open]);

  const handleProceedToStep2 = useCallback(async () => {
    if (!fromDocType) return;
    setIsFetchingDocs(true);
    setFetchError(null);
    setDocs([]);
    setSelectedDocNo(null);
    try {
      const rows = await fetchSourceDocumentsForCopy(fromDocType as PurchaseCopyFromDocType);
      setDocs(rows);
      setStep(2);
    } catch {
      setFetchError("Failed to load documents. Please try again.");
    } finally {
      setIsFetchingDocs(false);
    }
  }, [fromDocType]);

  const handleConfirmCopy = useCallback(async () => {
    if (!selectedDocNo || !fromDocType) return;
    setIsCopying(true);
    setCopyError(null);
    try {
      await executePurchaseCopyDocument({
        fromDocType: fromDocType as PurchaseCopyFromDocType,
        fromDocNo: selectedDocNo,
        toDocType,
        toDocNo,
        includeHeader: true,
        recalculateLines: false,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        "Copy document failed. Please try again.";
      setCopyError(msg);
    } finally {
      setIsCopying(false);
    }
  }, [selectedDocNo, fromDocType, toDocType, toDocNo, onSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Copy className="h-4 w-4" />
            Copy Document
          </DialogTitle>
          <DialogDescription className="text-xs">
            Copy lines and header data from another purchase document into{" "}
            <span className="font-medium text-foreground">{toDocNo}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: choose fromDocType ── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Copy from document type
              </label>
              <Select
                value={fromDocType}
                onValueChange={(v) => setFromDocType(v as PurchaseCopyFromDocType)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  {fromDocOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {fetchError && (
              <p className="text-xs text-destructive">{fetchError}</p>
            )}
          </div>
        )}

        {/* ── Step 2: select a specific document ── */}
        {step === 2 && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setStep(1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <span className="text-xs text-muted-foreground">
                Select a{" "}
                <span className="font-medium text-foreground">{fromDocType}</span>{" "}
                document
              </span>
            </div>

            {isFetchingDocs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : docs.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No documents found.
              </p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-muted/60">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8"></th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Document No.
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Vendor
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Posting Date
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((doc) => (
                        <tr
                          key={doc.no}
                          className={cn(
                            "cursor-pointer border-t transition-colors hover:bg-muted/40",
                            selectedDocNo === doc.no && "bg-primary/5",
                          )}
                          onClick={() => setSelectedDocNo(doc.no)}
                        >
                          <td className="px-3 py-2">
                            <div
                              className={cn(
                                "h-3.5 w-3.5 rounded-full border-2 transition-colors",
                                selectedDocNo === doc.no
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">{doc.no}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {doc.vendorName || doc.vendorNo || "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {doc.postingDate || "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {typeof doc.amount === "number"
                              ? doc.amount.toFixed(2)
                              : doc.amount || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {copyError && (
              <p className="text-xs text-destructive">{copyError}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isCopying}
          >
            Cancel
          </Button>

          {step === 1 ? (
            <Button
              size="sm"
              onClick={handleProceedToStep2}
              disabled={!fromDocType || isFetchingDocs}
            >
              {isFetchingDocs ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Next"
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleConfirmCopy}
              disabled={!selectedDocNo || isCopying}
            >
              {isCopying ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Document
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
