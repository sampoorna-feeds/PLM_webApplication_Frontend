"use client";

/**
 * Reusable Searchable Select Component
 * Provides debounced search, scroll pagination, and dual API call support
 * Used for GL Account, Item, UOM, and other searchable dropdowns
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

export interface SearchableItem {
  [key: string]: any;
  No?: string;
  Code?: string;
  Name?: string;
  Description?: string;
}

interface SearchableSelectProps<T extends SearchableItem> {
  value: string;
  onChange: (value: string, item?: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
  // API functions
  loadInitial: () => Promise<T[]>;
  searchItems: (query: string) => Promise<T[]>;
  loadMore?: (skip: number, search?: string) => Promise<T[]>;
  // Display configuration
  getDisplayValue: (item: T) => string;
  getItemValue: (item: T) => string;
  // Search configuration
  minSearchLength?: number;
  debounceMs?: number;
  initialLoadCount?: number;
  pageSize?: number;
  // Dual search support (search by No and Name separately)
  supportsDualSearch?: boolean;
  searchByField?: (query: string, field: "No" | "Name") => Promise<T[]>;
}

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_MIN_SEARCH_LENGTH = 2;
const DEFAULT_INITIAL_LOAD_COUNT = 20;
const DEFAULT_PAGE_SIZE = 30;

export function SearchableSelect<T extends SearchableItem>({
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
  loadInitial,
  searchItems,
  loadMore,
  getDisplayValue,
  getItemValue,
  minSearchLength = DEFAULT_MIN_SEARCH_LENGTH,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  initialLoadCount = DEFAULT_INITIAL_LOAD_COUNT,
  pageSize = DEFAULT_PAGE_SIZE,
  supportsDualSearch = false,
  searchByField,
}: SearchableSelectProps<T>) {
  const [items, setItems] = useState<T[]>([]);
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
      const result = await loadInitial();
      setItems(result);
      setSkip(result.length);
      setHasMore(result.length >= initialLoadCount);
    } catch (error) {
      console.error("Error loading initial items:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadInitial, initialLoadCount]);

  // Search with debounce
  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < minSearchLength) {
        setSearchQuery(query);
        // Load initial items if search is too short
        if (query.length === 0) {
          loadInitialItems();
        }
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
          let result: T[];

          if (supportsDualSearch && searchByField) {
            // Make 2 parallel API calls: one for No, one for Name
            const [resultsByNo, resultsByName] = await Promise.all([
              searchByField(query, "No"),
              searchByField(query, "Name"),
            ]);

            // Combine results and deduplicate
            const combined = [...resultsByNo, ...resultsByName];
            const uniqueMap = new Map<string, T>();
            combined.forEach((item) => {
              const key = getItemValue(item);
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
              }
            });
            result = Array.from(uniqueMap.values());
          } else {
            result = await searchItems(query);
          }

          // Check if request was aborted
          if (controller.signal.aborted) {
            return;
          }

          setItems(result);
          setSkip(result.length);
          setHasMore(result.length >= pageSize);
        } catch (error) {
          // Ignore abort errors
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          // Check if request was aborted
          if (controller.signal.aborted) {
            return;
          }
          console.error("Error searching items:", error);
          setItems([]);
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, debounceMs);
    },
    [
      minSearchLength,
      debounceMs,
      searchItems,
      supportsDualSearch,
      searchByField,
      getItemValue,
      pageSize,
      loadInitialItems,
    ],
  );

  // Load more items (pagination)
  const loadMoreItems = useCallback(async () => {
    if (isLoading || !hasMore || !loadMore) return;

    setIsLoading(true);
    try {
      const newItems = await loadMore(skip, searchQuery || undefined);
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...newItems]);
        setSkip((prev) => prev + newItems.length);
        setHasMore(newItems.length >= pageSize);
      }
    } catch (error) {
      console.error("Error loading more items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, skip, searchQuery, loadMore, pageSize]);

  // Handle dropdown open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Only load if items are empty
      if (items.length === 0) {
        loadInitialItems();
      }
    } else {
      setSearchQuery("");
    }
  };

  // Handle scroll for pagination
  useEffect(() => {
    if (!isOpen || !listRef.current || !loadMore) return;

    const handleScroll = () => {
      const element = listRef.current;
      if (!element) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;

      if (isNearBottom && hasMore && !isLoading) {
        loadMoreItems();
      }
    };

    const element = listRef.current;
    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, [isOpen, hasMore, isLoading, loadMoreItems, loadMore]);

  // Find selected item display value
  const selectedItem = items.find((item) => getItemValue(item) === value);
  const displayValue = selectedItem
    ? getDisplayValue(selectedItem)
    : value || "";

  // Filter items based on search query (client-side filtering for display)
  const filteredItems =
    searchQuery.length >= minSearchLength
      ? items.filter((item) => {
          const display = getDisplayValue(item).toLowerCase();
          return display.includes(searchQuery.toLowerCase());
        })
      : items;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            hasError && (errorClass || "border-destructive"),
            className,
          )}
          disabled={disabled}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[calc(100vw-2rem)] max-h-[var(--radix-popover-content-available-height,80vh)] min-h-0 flex-col overflow-hidden p-0"
        align="start"
        collisionPadding={8}
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus from scrolling
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Prevent auto-focus from scrolling
          e.preventDefault();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Search Input */}
          <div className="flex-shrink-0 border-b p-2">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                performSearch(query);
              }}
              className="h-8"
              autoFocus={false}
            />
          </div>

          {/* Items List */}
          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-sm">
                {searchQuery.length < minSearchLength
                  ? `Type at least ${minSearchLength} characters to search`
                  : "No items found"}
              </div>
            ) : (
              <>
                {filteredItems.map((item) => {
                  const itemValue = getItemValue(item);
                  const isSelected = value === itemValue;
                  return (
                    <div
                      key={itemValue}
                      className={cn(
                        "hover:bg-accent hover:text-accent-foreground relative flex cursor-default items-start rounded-sm px-2 py-2 text-sm outline-none select-none",
                        isSelected && "bg-accent text-accent-foreground",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        onChange(itemValue, item);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        {/* Two-line format: No on first line, Description/Name on second */}
                        {item.No && (item.Description || item.Name) ? (
                          <div className="flex flex-col">
                            <span className="text-foreground font-medium">
                              {item.No}
                            </span>
                            <span className="text-muted-foreground text-xs break-words">
                              {item.Description || item.Name || ""}
                            </span>
                          </div>
                        ) : (
                          <span className="break-words">
                            {getDisplayValue(item)}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <CheckIcon className="mt-0.5 ml-2 h-4 w-4 shrink-0" />
                      )}
                    </div>
                  );
                })}
                {isLoading && items.length > 0 && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
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
