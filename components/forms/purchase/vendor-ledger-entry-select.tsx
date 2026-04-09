"use client";

/**
 * VendorLedgerEntrySelect component
 * Searchable, infinite-scroll dropdown for picking an open vendor ledger entry.
 * Used for Vendor Invoice No / Vendor Cr. Memo No fields across all 4 purchase doc types.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getOpenVendorLedgerEntries } from "@/lib/api/services/vendor-ledger.service";
import type { VendorLedgerEntry } from "@/lib/api/services/vendor-ledger.service";

interface VendorLedgerEntrySelectProps {
  vendorNo: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

export function VendorLedgerEntrySelect({
  vendorNo,
  value,
  onChange,
  placeholder = "Select or type...",
  disabled = false,
  className,
}: VendorLedgerEntrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<VendorLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);

  const listRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadEntries = useCallback(
    async (opts: { skip: number; search: string; replace: boolean }) => {
      if (!vendorNo) return;
      setIsLoading(true);
      try {
        const results = await getOpenVendorLedgerEntries(
          vendorNo,
          opts.skip,
          PAGE_SIZE,
          opts.search || undefined,
        );
        setItems((prev) =>
          opts.replace ? results : [...prev, ...results],
        );
        setSkip(opts.skip + results.length);
        setHasMore(results.length >= PAGE_SIZE);
      } catch (err) {
        console.error("Error loading vendor ledger entries:", err);
        if (opts.replace) setItems([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [vendorNo],
  );

  // Reset and reload when vendor changes or dropdown opens
  const handleOpenChange = (open: boolean) => {
    if (disabled) return;
    setIsOpen(open);
    if (open) {
      setSearchQuery("");
      setItems([]);
      setSkip(0);
      setHasMore(true);
      loadEntries({ skip: 0, search: "", replace: true });
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    debounceTimerRef.current = setTimeout(() => {
      setItems([]);
      setSkip(0);
      setHasMore(true);
      loadEntries({ skip: 0, search: query, replace: true });
    }, DEBOUNCE_MS);
  };

  // Infinite scroll
  useEffect(() => {
    if (!isOpen || !listRef.current) return;

    const handleScroll = () => {
      const el = listRef.current;
      if (!el || isLoading || !hasMore) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        loadEntries({ skip, search: searchQuery, replace: false });
      }
    };

    const el = listRef.current;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isOpen, isLoading, hasMore, skip, searchQuery, loadEntries]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const getEntryLabel = (entry: VendorLedgerEntry) => {
    const ext = entry.External_Document_No?.trim();
    const docNo = entry.Document_No?.trim();
    if (ext && ext !== docNo) return `${ext} (${docNo})`;
    return docNo || ext || String(entry.Entry_No);
  };

  const getEntryValue = (entry: VendorLedgerEntry) => {
    // Use External_Document_No (vendor's number) as the stored value
    return entry.External_Document_No?.trim() || entry.Document_No?.trim() || "";
  };

  const displayLabel = (() => {
    if (!value) return "";
    const matched = items.find(
      (e) => getEntryValue(e) === value,
    );
    return matched ? getEntryLabel(matched) : value;
  })();

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-between text-xs font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex max-h-(--radix-popover-content-available-height,80vh) min-h-0 w-(--radix-popover-trigger-width) min-w-64 flex-col overflow-hidden p-0"
        align="start"
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex-shrink-0 border-b p-2">
          <Input
            placeholder="Search by doc no..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 text-sm"
            autoFocus={false}
          />
        </div>
        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
          style={{ maxHeight: "240px" }}
        >
          {isLoading && items.length === 0 ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : !vendorNo ? (
            <div className="text-muted-foreground p-4 text-center text-sm">
              Select a vendor first
            </div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-sm">
              No open entries found
            </div>
          ) : (
            <>
              {items.map((entry) => {
                const entryValue = getEntryValue(entry);
                const isSelected = value === entryValue;
                return (
                  <div
                    key={entry.Entry_No}
                    className={cn(
                      "hover:bg-muted/50 relative flex cursor-default items-start rounded-sm px-2 py-2 text-sm outline-none select-none",
                      isSelected && "bg-muted",
                    )}
                    onClick={() => {
                      onChange(entryValue);
                      setIsOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mt-0.5 mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground font-medium break-words">
                        {getEntryLabel(entry)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {entry.Document_Type} · {entry.Posting_Date}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
