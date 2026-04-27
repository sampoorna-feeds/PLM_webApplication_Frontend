"use client";

/**
 * Sales Copy Document Dialog
 *
 * Two-step dialog:
 *   Step 1 — Select LOB / Branch / Location and "from" document type.
 *   Step 2 — Pick a specific document from a paginated table, then confirm.
 *
 * Props:
 *   open           — controls dialog visibility
 *   toDocNo        — the already-created document number to copy INTO (optional — created on-the-fly if absent)
 *   toDocType      — the target document type ("Invoice" | "Credit Memo" | "Return Order")
 *   onOpenChange   — called when dialog should open/close
 *   onSuccess      — called after a successful copy (receives created doc no)
 *   onCreateHeader — called to create header on-the-fly if toDocNo is not yet set
 *   userId         — forwarded to CascadingDimensionSelect
 *   lobValue       — pre-fill LOB from parent form
 *   branchValue    — pre-fill Branch from parent form
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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  ChevronLeft,
  Copy,
  Search,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  X,
} from "lucide-react";
import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import {
  SALES_COPY_FROM_DOC_TYPE_OPTIONS,
  fetchSalesSourceDocumentsForCopy,
  executeSalesCopyDocument,
  type SalesCopySourceFilters,
  type SalesCopySourceSortColumn,
  type SalesCopySourceSortDirection,
  type SalesCopyFromDocType,
  type SalesCopyToDocType,
  type SalesSourceDocumentRow,
} from "@/lib/api/services/sales-copy-document.service";
import { cn } from "@/lib/utils";

interface SalesCopyDocumentDialogProps {
  open: boolean;
  toDocNo?: string;
  toDocType: SalesCopyToDocType;
  onOpenChange: (open: boolean) => void;
  onSuccess: (docNo?: string) => void | Promise<void>;
  onCreateHeader?: (
    locCode: string,
    lobCode: string,
    branchCode: string,
  ) => Promise<string>;
  userId?: string;
  lobValue?: string;
  branchValue?: string;
}

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_FILTERS: SalesCopySourceFilters = {
  documentNo: "",
  customerNo: "",
  postingDateFrom: "",
  postingDateTo: "",
};

function normalizeFilters(
  filters: SalesCopySourceFilters,
): SalesCopySourceFilters {
  return {
    documentNo: filters.documentNo?.trim() || undefined,
    customerNo: filters.customerNo?.trim() || undefined,
    postingDateFrom: filters.postingDateFrom || undefined,
    postingDateTo: filters.postingDateTo || undefined,
  };
}

function getSortIcon(
  column: SalesCopySourceSortColumn,
  activeColumn: SalesCopySourceSortColumn,
  direction: SalesCopySourceSortDirection,
) {
  if (column !== activeColumn) {
    return <ArrowUpDown className="h-3 w-3 opacity-50" />;
  }
  return direction === "asc" ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  );
}

interface TextFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

interface DateFilterProps {
  label: string;
  valueFrom: string;
  valueTo: string;
  onChange: (from: string, to: string) => void;
}

function CopyDocTextFilter({ label, value, onChange }: TextFilterProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  const hasFilter = !!value;

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "hover:bg-background/50 rounded p-0.5 transition-colors",
            hasFilter
              ? "text-primary"
              : "text-muted-foreground/50 hover:text-muted-foreground",
          )}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          <Filter className={cn("h-3 w-3", hasFilter && "fill-current")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label className="text-xs font-medium">Filter {label}</Label>
          <Input
            placeholder="Enter value..."
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChange(local);
                setOpen(false);
              }
            }}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => {
              onChange(local);
              setOpen(false);
            }}
          >
            Apply
          </Button>
          {hasFilter && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setLocal("");
                onChange("");
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CopyDocDateFilter({
  label,
  valueFrom,
  valueTo,
  onChange,
}: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(valueFrom);
  const [localTo, setLocalTo] = useState(valueTo);
  const hasFilter = !!(valueFrom || valueTo);

  useEffect(() => {
    setLocalFrom(valueFrom);
    setLocalTo(valueTo);
  }, [valueFrom, valueTo]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "hover:bg-background/50 rounded p-0.5 transition-colors",
            hasFilter
              ? "text-primary"
              : "text-muted-foreground/50 hover:text-muted-foreground",
          )}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          <Filter className={cn("h-3 w-3", hasFilter && "fill-current")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <Label className="text-xs font-medium">Filter {label}</Label>
          <div className="space-y-2">
            <div>
              <Label className="text-muted-foreground text-xs">From</Label>
              <Input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">To</Label>
              <Input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => {
              onChange(localFrom, localTo);
              setOpen(false);
            }}
          >
            Apply
          </Button>
          {hasFilter && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setLocalFrom("");
                setLocalTo("");
                onChange("", "");
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SalesCopyDocumentDialog({
  open,
  toDocNo,
  toDocType,
  onOpenChange,
  onSuccess,
  onCreateHeader,
  userId,
  lobValue,
  branchValue,
}: SalesCopyDocumentDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [lobCode, setLobCode] = useState(lobValue || "");
  const [branchCode, setBranchCode] = useState(branchValue || "");
  const [locationCode, setLocationCode] = useState("");
  const [fromDocType, setFromDocType] = useState<SalesCopyFromDocType | "">(
    "",
  );
  const [docs, setDocs] = useState<SalesSourceDocumentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextSkip, setNextSkip] = useState(0);
  const [isFetchingDocs, setIsFetchingDocs] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedDocNo, setSelectedDocNo] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<SalesCopySourceFilters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] =
    useState<SalesCopySourceSortColumn>("Posting_Date");
  const [sortDirection, setSortDirection] =
    useState<SalesCopySourceSortDirection>("desc");
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestCounterRef = useRef(0);

  const fromDocOptions = SALES_COPY_FROM_DOC_TYPE_OPTIONS[toDocType] ?? [];

  useEffect(() => {
    if (!open) {
      setStep(1);
      setLobCode("");
      setBranchCode("");
      setLocationCode("");
      setFromDocType("");
      setDocs([]);
      setTotalCount(0);
      setHasMore(false);
      setNextSkip(0);
      setFetchError(null);
      setSelectedDocNo(null);
      setSearchInput("");
      setSearchTerm("");
      setFilters(EMPTY_FILTERS);
      setSortBy("Posting_Date");
      setSortDirection("desc");
      setCopyError(null);
    } else {
      setLobCode(lobValue || "");
      setBranchCode(branchValue || "");
    }
  }, [open, lobValue, branchValue]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleLobChange = useCallback((value: string) => {
    setLobCode(value);
    setBranchCode("");
    setLocationCode("");
  }, []);

  const handleBranchChange = useCallback((value: string) => {
    setBranchCode(value);
    setLocationCode("");
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
        const result = await fetchSalesSourceDocumentsForCopy({
          fromDocType: fromDocType as SalesCopyFromDocType,
          searchTerm: searchTerm.trim() || undefined,
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
    [fromDocType, searchTerm, filters, sortBy, sortDirection],
  );

  useEffect(() => {
    if (step !== 2 || !fromDocType || !locationCode) return;

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
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    step,
    fromDocType,
    locationCode,
    searchTerm,
    filters.documentNo,
    filters.customerNo,
    filters.postingDateFrom,
    filters.postingDateTo,
    sortBy,
    sortDirection,
    fetchDocs,
  ]);

  const handleProceedToStep2 = useCallback(() => {
    if (!fromDocType || !locationCode || !lobCode || !branchCode) return;
    setStep(2);
    setDocs([]);
    setTotalCount(0);
    setHasMore(false);
    setNextSkip(0);
    setFetchError(null);
    setSelectedDocNo(null);
    setSearchInput("");
    setSearchTerm("");
    setFilters(EMPTY_FILTERS);
    setSortBy("Posting_Date");
    setSortDirection("desc");
  }, [fromDocType, locationCode, lobCode, branchCode]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isFetchingDocs || isFetchingMore) return;
    void fetchDocs(nextSkip, true);
  }, [fetchDocs, hasMore, isFetchingDocs, isFetchingMore, nextSkip]);

  const handleTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || isFetchingDocs || isFetchingMore) return;

    const target = event.currentTarget;
    const nearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 60;

    if (nearBottom) {
      handleLoadMore();
    }
  };

  const handleSort = (column: SalesCopySourceSortColumn) => {
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

  const handleConfirmCopy = useCallback(async () => {
    if (
      !selectedDocNo ||
      !fromDocType ||
      !locationCode ||
      !lobCode ||
      !branchCode
    )
      return;

    setIsCopying(true);
    setCopyError(null);

    try {
      let targetDocNo = toDocNo;

      if (!targetDocNo) {
        if (!onCreateHeader) {
          throw new Error("Missing callback to create document header.");
        }
        targetDocNo = await onCreateHeader(locationCode, lobCode, branchCode);
        if (!targetDocNo) {
          throw new Error("Failed to get document number after creation.");
        }
      }

      await executeSalesCopyDocument({
        fromDocType1: fromDocType as SalesCopyFromDocType,
        fromDocNo: selectedDocNo,
        salesHeaderNo: targetDocNo,
      });

      await Promise.resolve(onSuccess(targetDocNo));
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        "Copy document failed. Please try again.";
      setCopyError(msg);
    } finally {
      setIsCopying(false);
    }
  }, [
    selectedDocNo,
    fromDocType,
    toDocNo,
    locationCode,
    lobCode,
    branchCode,
    onCreateHeader,
    onSuccess,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[95vw] overflow-hidden",
          step === 1 ? "max-h-[90vh] sm:max-w-2xl" : "h-[90vh] sm:max-w-7xl",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Copy className="h-4 w-4" />
            Copy Document
          </DialogTitle>
          <DialogDescription className="text-xs">
            {toDocNo ? (
              <>
                Copy lines and header data from another sales document into{" "}
                <span className="text-foreground font-medium">{toDocNo}</span>.
              </>
            ) : (
              "Select location and document type to copy from."
            )}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: choose LOB / Branch / Location + fromDocType ── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">
                LOB
              </label>
              <CascadingDimensionSelect
                dimensionType="LOB"
                value={lobCode}
                onChange={handleLobChange}
                placeholder="Select LOB"
                userId={userId}
                compactWhenSingle
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">
                Branch
              </label>
              <CascadingDimensionSelect
                dimensionType="BRANCH"
                value={branchCode}
                onChange={handleBranchChange}
                placeholder="Select Branch"
                lobValue={lobCode}
                userId={userId}
                compactWhenSingle
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">
                Location
              </label>
              <CascadingDimensionSelect
                dimensionType="LOC"
                value={locationCode}
                onChange={setLocationCode}
                placeholder="Select Location"
                lobValue={lobCode}
                branchValue={branchCode}
                userId={userId}
                compactWhenSingle
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">
                Copy from document type
              </label>
              <Select
                value={fromDocType}
                onValueChange={(v) =>
                  setFromDocType(v as SalesCopyFromDocType)
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
          </div>
        )}

        {/* ── Step 2: select a specific document ── */}
        {step === 2 && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden py-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
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

            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                value={searchInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearchInput(value);
                  setSearchTerm(value);
                }}
                placeholder="Search by document no"
                className="h-9 pl-9 text-xs"
              />
            </div>

            <div className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
              <div
                className="min-h-0 flex-1 overflow-auto"
                onScroll={handleTableScroll}
              >
                <table className="w-full caption-bottom text-sm">
                  <thead className="bg-muted sticky top-0 z-10 [&_tr]:border-b">
                    <tr className="border-b transition-colors">
                      <th className="text-foreground h-10 w-12 px-3 py-3 text-center align-middle text-xs font-bold whitespace-nowrap select-none">
                        S.No
                      </th>
                      {/* Document No */}
                      <th
                        className={cn(
                          "text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none",
                          sortBy === "No" && "text-primary",
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="hover:text-primary cursor-pointer transition-colors"
                            onClick={() => handleSort("No")}
                          >
                            Document No
                          </span>
                          <button
                            type="button"
                            className="hover:text-primary transition-colors"
                            onClick={() => handleSort("No")}
                          >
                            {getSortIcon("No", sortBy, sortDirection)}
                          </button>
                          <CopyDocTextFilter
                            label="Document No"
                            value={filters.documentNo ?? ""}
                            onChange={(v) =>
                              setFilters((prev) => ({
                                ...prev,
                                documentNo: v,
                              }))
                            }
                          />
                        </div>
                      </th>
                      {/* Customer No */}
                      <th
                        className={cn(
                          "text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none",
                          sortBy === "Sell_to_Customer_No" && "text-primary",
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="hover:text-primary cursor-pointer transition-colors"
                            onClick={() => handleSort("Sell_to_Customer_No")}
                          >
                            Customer No
                          </span>
                          <button
                            type="button"
                            className="hover:text-primary transition-colors"
                            onClick={() => handleSort("Sell_to_Customer_No")}
                          >
                            {getSortIcon(
                              "Sell_to_Customer_No",
                              sortBy,
                              sortDirection,
                            )}
                          </button>
                          <CopyDocTextFilter
                            label="Customer No"
                            value={filters.customerNo ?? ""}
                            onChange={(v) =>
                              setFilters((prev) => ({
                                ...prev,
                                customerNo: v,
                              }))
                            }
                          />
                        </div>
                      </th>
                      {/* Customer Name */}
                      <th
                        className={cn(
                          "text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none",
                          sortBy === "Sell_to_Customer_Name" && "text-primary",
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="hover:text-primary cursor-pointer transition-colors"
                            onClick={() =>
                              handleSort("Sell_to_Customer_Name")
                            }
                          >
                            Customer Name
                          </span>
                          <button
                            type="button"
                            className="hover:text-primary transition-colors"
                            onClick={() =>
                              handleSort("Sell_to_Customer_Name")
                            }
                          >
                            {getSortIcon(
                              "Sell_to_Customer_Name",
                              sortBy,
                              sortDirection,
                            )}
                          </button>
                        </div>
                      </th>
                      {/* Posting Date */}
                      <th
                        className={cn(
                          "text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none",
                          sortBy === "Posting_Date" && "text-primary",
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="hover:text-primary cursor-pointer transition-colors"
                            onClick={() => handleSort("Posting_Date")}
                          >
                            Posting Date
                          </span>
                          <button
                            type="button"
                            className="hover:text-primary transition-colors"
                            onClick={() => handleSort("Posting_Date")}
                          >
                            {getSortIcon("Posting_Date", sortBy, sortDirection)}
                          </button>
                          <CopyDocDateFilter
                            label="Posting Date"
                            valueFrom={filters.postingDateFrom ?? ""}
                            valueTo={filters.postingDateTo ?? ""}
                            onChange={(from, to) =>
                              setFilters((prev) => ({
                                ...prev,
                                postingDateFrom: from,
                                postingDateTo: to,
                              }))
                            }
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {isFetchingDocs &&
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr
                          key={`skel-${i}`}
                          className="border-b transition-colors"
                        >
                          <td className="px-3 py-3 text-center">
                            <Skeleton className="mx-auto h-3 w-6" />
                          </td>
                          <td className="px-3 py-3">
                            <Skeleton className="h-3 w-24" />
                          </td>
                          <td className="px-3 py-3">
                            <Skeleton className="h-3 w-20" />
                          </td>
                          <td className="px-3 py-3">
                            <Skeleton className="h-3 w-32" />
                          </td>
                          <td className="px-3 py-3">
                            <Skeleton className="h-3 w-20" />
                          </td>
                        </tr>
                      ))}

                    {!isFetchingDocs && docs.length === 0 && (
                      <tr className="border-b transition-colors">
                        <td
                          colSpan={5}
                          className="text-muted-foreground h-24 p-2 text-center align-middle"
                        >
                          No sales documents found
                        </td>
                      </tr>
                    )}

                    {!isFetchingDocs &&
                      docs.map((doc, index) => (
                        <tr
                          key={doc.no}
                          className={cn(
                            "hover:bg-muted cursor-pointer border-b transition-colors",
                            selectedDocNo === doc.no && "bg-muted",
                          )}
                          onClick={() => setSelectedDocNo(doc.no)}
                        >
                          <td className="text-muted-foreground px-3 py-3 text-center align-middle text-xs whitespace-nowrap">
                            {index + 1}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-3 align-middle text-xs font-medium whitespace-nowrap",
                              selectedDocNo === doc.no && "text-primary",
                            )}
                          >
                            {doc.no || "-"}
                          </td>
                          <td className="px-3 py-3 align-middle text-xs whitespace-nowrap">
                            {doc.customerNo || "-"}
                          </td>
                          <td className="px-3 py-3 align-middle text-xs whitespace-nowrap">
                            {doc.customerName || "-"}
                          </td>
                          <td className="px-3 py-3 align-middle text-xs whitespace-nowrap">
                            {doc.postingDate || "-"}
                          </td>
                        </tr>
                      ))}

                    {isFetchingMore && (
                      <tr className="border-b transition-colors">
                        <td
                          colSpan={5}
                          className="text-muted-foreground px-3 py-3 text-center text-xs"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading more…
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

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
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isCopying}
          >
            Cancel
          </Button>

          {step === 1 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleProceedToStep2}
              disabled={
                !fromDocType || !locationCode || !lobCode || !branchCode
              }
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
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
