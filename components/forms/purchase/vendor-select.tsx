"use client";

/**
 * VendorSelect component for Purchase forms
 * Smart dropdown with search, debounce, and pagination for Vendor selection
 * Uses Vendor API with fields: No, Name
 * Mirrors the CustomerSelect pattern from Sales forms
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
import {
  getVendors,
  searchVendors,
  getVendorsPage,
  type Vendor,
} from "@/lib/api/services/vendor.service";

export type { Vendor as PurchaseVendor };

interface VendorSelectProps {
  value: string;
  onChange: (value: string, vendor?: Vendor) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
}

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const INITIAL_LOAD_COUNT = 20;
const PAGE_SIZE = 30;

export function VendorSelect({
  value,
  onChange,
  placeholder = "Select vendor",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
}: VendorSelectProps) {
  const [items, setItems] = useState<Vendor[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial items when dropdown opens
  const loadInitialItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getVendors();
      setItems(result);
      setSkip(result.length);
      setHasMore(result.length >= INITIAL_LOAD_COUNT);
    } catch (error) {
      console.error("Error loading vendors:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search with debounce and request cancellation
  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < MIN_SEARCH_LENGTH) {
        setSearchQuery(query);
        loadInitialItems();
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the search
      debounceTimerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
          const result = await searchVendors(query);

          // Check if request was aborted
          if (controller.signal.aborted) {
            return;
          }

          setItems(result);
          setSkip(result.length);
          setHasMore(result.length >= PAGE_SIZE);
        } catch (error) {
          // Ignore abort errors
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          // Check if request was aborted
          if (controller.signal.aborted) {
            return;
          }
          console.error("Error searching vendors:", error);
          setItems([]);
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [loadInitialItems],
  );

  // Load more items (pagination)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const newItems = await getVendorsPage(skip, searchQuery || undefined);
      if (newItems.length > 0) {
        setItems((prev) => {
          // Deduplicate by No
          const existingNos = new Set(prev.map((item) => item.No));
          const uniqueNewItems = newItems.filter(
            (item) => !existingNos.has(item.No),
          );
          return [...prev, ...uniqueNewItems].sort((a, b) =>
            a.No.localeCompare(b.No),
          );
        });
        setSkip((prev) => prev + newItems.length);
        setHasMore(newItems.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more vendors:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, skip, searchQuery]);

  // Handle dropdown open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      if (items.length === 0) {
        loadInitialItems();
      }
      setSearchQuery("");
    }
  };

  // Handle scroll for pagination
  useEffect(() => {
    if (!isOpen || !listRef.current) return;

    const handleScroll = () => {
      const element = listRef.current;
      if (!element) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      if (isNearBottom && hasMore && !isLoading) {
        loadMore();
      }
    };

    const element = listRef.current;
    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, [isOpen, hasMore, isLoading, loadMore]);

  // Find selected item display value
  const selectedItem = items.find((item) => item.No === value);
  const displayValue = selectedItem
    ? `${selectedItem.No} - ${selectedItem.Name}`
    : value || "";

  // Filter items based on search query (client-side filtering for display)
  const filteredItems =
    searchQuery.length >= MIN_SEARCH_LENGTH
      ? items.filter((item) => {
          const codeMatch = item.No?.toLowerCase().includes(
            searchQuery.toLowerCase(),
          );
          const nameMatch = item.Name?.toLowerCase().includes(
            searchQuery.toLowerCase(),
          );
          return codeMatch || nameMatch;
        })
      : items;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between text-sm font-normal shadow-sm",
            !value && "text-muted-foreground",
            className,
            errorClass,
          )}
          data-field-error={hasError}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex max-h-[var(--radix-popover-content-available-height,80vh)] min-h-0 w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] min-w-[320px] flex-col overflow-hidden p-0"
        align="start"
        collisionPadding={8}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b p-2">
            <Input
              placeholder="Search by Code or Name..."
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                performSearch(query);
              }}
              className="h-8 text-sm"
              autoFocus={false}
            />
          </div>
          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
          >
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                {searchQuery.length < MIN_SEARCH_LENGTH
                  ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
                  : "No vendors found"}
              </div>
            ) : (
              <>
                {filteredItems.map((item) => (
                  <div
                    key={item.No}
                    className={cn(
                      "hover:bg-muted/50 relative flex cursor-default items-start rounded-sm px-2 py-2 text-sm outline-none select-none",
                      value === item.No && "bg-muted",
                    )}
                    onClick={() => {
                      onChange(item.No, item);
                      setIsOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mt-0.5 mr-2 h-4 w-4 shrink-0",
                        value === item.No ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground font-medium break-words">
                        {item.No} - {item.Name}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && filteredItems.length > 0 && (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
