"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApplyItemLedgerEntry } from "@/lib/api/services/purchase-orders.service";
import { ArrowDown, ArrowUp, ArrowUpDown, Pin, Search } from "lucide-react";
import { useState, useRef, useMemo, useCallback } from "react";


interface ApplyItemEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ApplyItemLedgerEntry[];
  onSelect: (entry: ApplyItemLedgerEntry) => void;
  title: string;
  isLoading?: boolean;
  selectedEntryNo?: number;
}

type SortField = "Entry_No" | "Posting_Date" | "Document_No" | "Item_No" | "Quantity" | "Remaining_Quantity";
type SortDir = "asc" | "desc";



export function ApplyItemEntryModal({
  isOpen,
  onClose,
  entries,
  onSelect,
  title,
  isLoading = false,
  selectedEntryNo,
}: ApplyItemEntryModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);



  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        // third click clears sort
        setSortField(null);
        setSortDir("asc");
      }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }, [sortField, sortDir]);



  const processed = useMemo(() => {
    // 1. Global search filter
    let result = entries;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter((entry) =>
        String(entry.Entry_No).toLowerCase().includes(s) ||
        (entry.Document_No?.toLowerCase() ?? "").includes(s) ||
        (entry.Item_No?.toLowerCase() ?? "").includes(s)
      );
    }



    // 3. Sort
    if (sortField) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    // 4. Pin selected entry to top
    if (selectedEntryNo !== undefined) {
      return [
        ...result.filter((e) => e.Entry_No === selectedEntryNo),
        ...result.filter((e) => e.Entry_No !== selectedEntryNo),
      ];
    }

    return result;
  }, [entries, searchTerm, sortField, sortDir, selectedEntryNo]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 text-primary" />
      : <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
  };

  const SortableHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <button
      type="button"
      className={`flex items-center gap-0.5 text-xs font-bold tracking-wider uppercase hover:text-primary transition-colors ${className ?? ""}`}
      onClick={() => handleSort(field)}
    >
      {label}
      <SortIcon field={field} />
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-primary/10 bg-background/95 flex max-h-[80vh] w-full flex-col overflow-hidden rounded-xl p-0 shadow-2xl backdrop-blur-xl sm:max-w-[700px]">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                ref={searchInputRef}
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const firstRow = tableBodyRef.current?.querySelector(
                      'tr[tabindex="0"]'
                    ) as HTMLElement | null;
                    firstRow?.focus();
                  }
                }}
              />
            </div>
          </div>
        </DialogHeader>
 
        <div className="flex-1 overflow-auto px-4 pb-4 pt-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="relative">
                <div className="border-primary/20 border-t-primary h-10 w-10 animate-spin rounded-full border-[3px]" />
                <Search className="text-primary/40 absolute inset-0 m-auto h-4 w-4" />
              </div>
              <p className="text-muted-foreground animate-pulse text-xs font-medium">
                Searching ledger entries...
              </p>
            </div>
          ) : processed.length === 0 ? (
            <div className="bg-muted/5 rounded-lg border-2 border-dashed py-16 text-center">
              <div className="bg-muted/20 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                <Search className="text-muted-foreground/40 h-6 w-6" />
              </div>
              <h3 className="text-foreground text-sm font-semibold">
                No entries found
              </h3>
              <p className="text-muted-foreground mx-auto mt-1 max-w-[220px] text-xs">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="bg-background overflow-hidden rounded-lg border shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b backdrop-blur-md">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[80px] px-3 py-2.5">
                      <SortableHeader field="Entry_No" label="Entry" />
                    </TableHead>
                    <TableHead className="w-[90px] px-3 py-2.5">
                      <SortableHeader field="Posting_Date" label="Date" />
                    </TableHead>
                    <TableHead className="min-w-[130px] px-3 py-2.5">
                      <SortableHeader field="Document_No" label="Document No" />
                    </TableHead>
                    <TableHead className="w-[100px] px-3 py-2.5">
                      <SortableHeader field="Item_No" label="Item No" />
                    </TableHead>
                    <TableHead className="w-[70px] px-3 py-2.5">
                      <SortableHeader field="Quantity" label="Qty" className="justify-end" />
                    </TableHead>
                    <TableHead className="w-[85px] px-3 py-2.5">
                      <SortableHeader field="Remaining_Quantity" label="Rem." className="justify-end" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody ref={tableBodyRef}>
                  {processed.map((entry) => {
                    const isPinned =
                      selectedEntryNo !== undefined &&
                      entry.Entry_No === selectedEntryNo;
                    return (
                      <TableRow
                        key={entry.Entry_No}
                        tabIndex={0}
                        className={`group cursor-pointer border-b transition-colors last:border-0 outline-none focus:bg-primary/[0.12] focus:ring-1 focus:ring-primary ${
                          isPinned
                            ? "bg-primary/[0.06] hover:bg-primary/[0.10]"
                            : "hover:bg-primary/[0.08]"
                        }`}
                        onClick={() => {
                          onSelect(entry);
                          onClose();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelect(entry);
                            onClose();
                          } else if (e.key === "ArrowDown") {
                            e.preventDefault();
                            const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                            if (next && next.tabIndex === 0) {
                              next.focus();
                            }
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                            if (prev && prev.tabIndex === 0) {
                              prev.focus();
                            } else {
                              searchInputRef.current?.focus();
                            }
                          }
                        }}
                      >
                        <TableCell className="px-3 py-2 font-mono text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            {isPinned && (
                              <Pin className="text-primary h-3 w-3 shrink-0" />
                            )}
                            {entry.Entry_No}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-xs">
                          {entry.Posting_Date ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge
                            variant="secondary"
                            className="bg-muted/50 border-none px-1.5 py-0 font-mono text-[10px]"
                          >
                            {entry.Document_No}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 font-mono text-[11px] font-bold">
                          {entry.Item_No ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right font-mono text-xs font-medium">
                          {entry.Quantity?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right">
                          <span className="text-primary font-mono text-sm font-black">
                            {entry.Remaining_Quantity?.toLocaleString() ?? "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer with entry count */}
        {!isLoading && processed.length > 0 && (
          <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            {processed.length} of {entries.length} entries
            {sortField && (
              <span className="ml-2">
                · Sorted by {sortField.replace(/_/g, " ")} ({sortDir})
              </span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
