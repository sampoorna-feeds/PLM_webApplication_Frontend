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

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ChevronLeft,
  Copy,
  Search,
  X,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";
import {
  COPY_FROM_DOC_TYPE_OPTIONS,
  type CopySourceFilters,
  type CopySourceSortColumn,
  type CopySourceSortDirection,
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
  onSuccess: () => void | Promise<void>;
}

const PAGE_SIZE = 25;

const EMPTY_FILTERS: CopySourceFilters = {
  documentNo: "",
  vendorNo: "",
  postingDateFrom: "",
  postingDateTo: "",
};

function normalizeFilters(filters: CopySourceFilters): CopySourceFilters {
  return {
    documentNo: filters.documentNo?.trim() || undefined,
    vendorNo: filters.vendorNo?.trim() || undefined,
    postingDateFrom: filters.postingDateFrom || undefined,
    postingDateTo: filters.postingDateTo || undefined,
  };
}

function getSortIcon(
  column: CopySourceSortColumn,
  activeColumn: CopySourceSortColumn,
  direction: CopySourceSortDirection,
) {
  if (column !== activeColumn) {
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
  }

  return direction === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" />
  );
}

export function PurchaseCopyDocumentDialog({
  open,
  toDocNo,
  toDocType,
  onOpenChange,
  onSuccess,
}: PurchaseCopyDocumentDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fromDocType, setFromDocType] = useState<PurchaseCopyFromDocType | "">(
    "",
  );
  const [docs, setDocs] = useState<SourceDocumentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextSkip, setNextSkip] = useState(0);
  const [isFetchingDocs, setIsFetchingDocs] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedDocNo, setSelectedDocNo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<CopySourceFilters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState<CopySourceSortColumn>("Posting_Date");
  const [sortDirection, setSortDirection] =
    useState<CopySourceSortDirection>("desc");
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestCounterRef = useRef(0);

  const fromDocOptions = COPY_FROM_DOC_TYPE_OPTIONS[toDocType] ?? [];
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(filters.documentNo) ||
    Boolean(filters.vendorNo) ||
    Boolean(filters.postingDateFrom) ||
    Boolean(filters.postingDateTo);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setFromDocType("");
      setDocs([]);
      setTotalCount(0);
      setHasMore(false);
      setNextSkip(0);
      setFetchError(null);
      setSelectedDocNo(null);
      setSearchQuery("");
      setFilters(EMPTY_FILTERS);
      setSortBy("Posting_Date");
      setSortDirection("desc");
      setCopyError(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const fetchDocs = useCallback(
    async (skip: number, append: boolean) => {
      if (!fromDocType) return;

      const requestId = ++requestCounterRef.current;
      if (append) {
        setIsFetchingMore(true);
      } else {
        setIsFetchingDocs(true);
      }

      try {
        const result = await fetchSourceDocumentsForCopy({
          fromDocType: fromDocType as PurchaseCopyFromDocType,
          searchTerm: searchQuery.trim() || undefined,
          filters: normalizeFilters(filters),
          sortBy,
          sortDirection,
          skip,
          top: PAGE_SIZE,
        });

        if (requestId !== requestCounterRef.current) {
          return;
        }

        setDocs((previousRows) =>
          append ? [...previousRows, ...result.rows] : result.rows,
        );
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setNextSkip(result.nextSkip);
        setFetchError(null);
      } catch {
        if (requestId !== requestCounterRef.current) {
          return;
        }

        setFetchError("Failed to load documents. Please try again.");
        if (!append) {
          setDocs([]);
          setTotalCount(0);
          setHasMore(false);
          setNextSkip(0);
        }
      } finally {
        if (requestId !== requestCounterRef.current) {
          return;
        }

        if (append) {
          setIsFetchingMore(false);
        } else {
          setIsFetchingDocs(false);
        }
      }
    },
    [filters, fromDocType, searchQuery, sortBy, sortDirection],
  );

  useEffect(() => {
    if (step !== 2 || !fromDocType) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setSelectedDocNo(null);
      setDocs([]);
      setTotalCount(0);
      setHasMore(false);
      setNextSkip(0);
      void fetchDocs(0, false);
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    step,
    fromDocType,
    searchQuery,
    filters.documentNo,
    filters.vendorNo,
    filters.postingDateFrom,
    filters.postingDateTo,
    sortBy,
    sortDirection,
    fetchDocs,
  ]);

  const handleProceedToStep2 = useCallback(() => {
    if (!fromDocType) return;
    setStep(2);
    setSearchQuery("");
    setFilters(EMPTY_FILTERS);
    setSortBy("Posting_Date");
    setSortDirection("desc");
    setDocs([]);
    setTotalCount(0);
    setHasMore(false);
    setNextSkip(0);
    setFetchError(null);
    setSelectedDocNo(null);
  }, [fromDocType]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isFetchingDocs || isFetchingMore) return;
    void fetchDocs(nextSkip, true);
  }, [fetchDocs, hasMore, isFetchingDocs, isFetchingMore, nextSkip]);

  const handleSort = (column: CopySourceSortColumn) => {
    setSortBy((previousColumn) => {
      if (previousColumn === column) {
        setSortDirection((previousDirection) =>
          previousDirection === "asc" ? "desc" : "asc",
        );
        return previousColumn;
      }

      setSortDirection("asc");
      return column;
    });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilters(EMPTY_FILTERS);
    setSortBy("Posting_Date");
    setSortDirection("desc");
  };

  const handleTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || isFetchingDocs || isFetchingMore) return;

    const target = event.currentTarget;
    const nearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 60;

    if (nearBottom) {
      handleLoadMore();
    }
  };

  const handleConfirmCopy = useCallback(async () => {
    if (!selectedDocNo || !fromDocType) return;
    setIsCopying(true);
    setCopyError(null);
    try {
      await executePurchaseCopyDocument({
        fromDocType1: fromDocType as PurchaseCopyFromDocType,
        fromDocNo: selectedDocNo,
        purchaseHeaderNo: toDocNo,
      });
      await Promise.resolve(onSuccess());
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        "Copy document failed. Please try again.";
      setCopyError(msg);
    } finally {
      setIsCopying(false);
    }
  }, [selectedDocNo, fromDocType, toDocNo, onSuccess, onOpenChange]);

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
            <span className="text-foreground font-medium">{toDocNo}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: choose fromDocType ── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">
                Copy from document type
              </label>
              <Select
                value={fromDocType}
                onValueChange={(v) =>
                  setFromDocType(v as PurchaseCopyFromDocType)
                }
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
              <p className="text-destructive text-xs">{fetchError}</p>
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
              <span className="text-muted-foreground text-xs">
                Select a{" "}
                <span className="text-foreground font-medium">
                  {fromDocType}
                </span>{" "}
                document
              </span>
              <span className="text-muted-foreground text-xs">{`(${totalCount} found)`}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="relative sm:col-span-2">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by document no or vendor..."
                  className="h-8 pr-8 pl-8 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Input
                value={filters.documentNo ?? ""}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    documentNo: event.target.value,
                  }))
                }
                placeholder="Filter: Document No"
                className="h-8 text-xs"
              />
              <Input
                value={filters.vendorNo ?? ""}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    vendorNo: event.target.value,
                  }))
                }
                placeholder="Filter: Vendor No"
                className="h-8 text-xs"
              />
              <Input
                type="date"
                value={filters.postingDateFrom ?? ""}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    postingDateFrom: event.target.value,
                  }))
                }
                className="h-8 text-xs"
              />
              <Input
                type="date"
                value={filters.postingDateTo ?? ""}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    postingDateTo: event.target.value,
                  }))
                }
                className="h-8 text-xs"
              />
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleResetFilters}
                >
                  Reset filters
                </Button>
              </div>
            )}

            {isFetchingDocs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : docs.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-xs">
                No documents found.
              </p>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <div
                  className="max-h-80 overflow-y-auto"
                  onScroll={handleTableScroll}
                >
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 sticky top-0 z-10">
                      <tr>
                        <th className="text-muted-foreground w-8 px-3 py-2 text-left font-medium"></th>
                        <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1"
                            onClick={() => handleSort("No")}
                          >
                            Document No.
                            {getSortIcon("No", sortBy, sortDirection)}
                          </button>
                        </th>
                        <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1"
                            onClick={() => handleSort("Buy_from_Vendor_Name")}
                          >
                            Vendor
                            {getSortIcon(
                              "Buy_from_Vendor_Name",
                              sortBy,
                              sortDirection,
                            )}
                          </button>
                        </th>
                        <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1"
                            onClick={() => handleSort("Posting_Date")}
                          >
                            Posting Date
                            {getSortIcon("Posting_Date", sortBy, sortDirection)}
                          </button>
                        </th>
                        <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                          <button
                            type="button"
                            className="ml-auto inline-flex items-center gap-1"
                            onClick={() => handleSort("Amount")}
                          >
                            Amount
                            {getSortIcon("Amount", sortBy, sortDirection)}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((doc) => (
                        <tr
                          key={doc.no}
                          className={cn(
                            "hover:bg-muted/40 cursor-pointer border-t transition-colors",
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
                          <td className="text-muted-foreground px-3 py-2">
                            {doc.vendorName || doc.vendorNo || "—"}
                          </td>
                          <td className="text-muted-foreground px-3 py-2">
                            {doc.postingDate || "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {typeof doc.amount === "number"
                              ? doc.amount.toFixed(2)
                              : doc.amount || "—"}
                          </td>
                        </tr>
                      ))}

                      {isFetchingMore && (
                        <tr className="border-t">
                          <td
                            colSpan={5}
                            className="text-muted-foreground px-3 py-2 text-center text-xs"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Loading more...
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {fetchError && (
              <p className="text-destructive text-xs">{fetchError}</p>
            )}

            {copyError && (
              <p className="text-destructive text-xs">{copyError}</p>
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
