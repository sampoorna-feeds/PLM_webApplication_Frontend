"use client";

/**
 * Reusable Searchable Select Component
 * Provides debounced search, scroll pagination, and dual API call support
 * Used for GL Account, Item, UOM, and other searchable dropdowns
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ChevronDownIcon, CheckIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
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
const DEFAULT_MIN_SEARCH_LENGTH = 0;
const DEFAULT_INITIAL_LOAD_COUNT = 50;
const DEFAULT_PAGE_SIZE = 50;

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
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const lastRequestId = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const closeReasonRef = useRef<"select" | "escape" | "tab" | "clickOutside" | null>(null);

  // Load initial items when dropdown opens
  const loadInitialItems = useCallback(async () => {
    const requestId = ++lastRequestId.current;
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await loadInitial();
      if (requestId !== lastRequestId.current) return;
      
      setItems(result);
      setSkip(result.length);
      setHasMore(result.length >= initialLoadCount);
    } catch (error) {
      if (requestId !== lastRequestId.current) return;
      console.error("Error loading initial items:", error);
      setItems([]);
    } finally {
      if (requestId === lastRequestId.current) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [loadInitial, initialLoadCount]);

  // Search with debounce
  const performSearch = useCallback(
    async (query: string) => {
      if (!query || !query.trim()) {
        setSearchQuery("");
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
        const requestId = ++lastRequestId.current;
        const controller = new AbortController();
        abortControllerRef.current = controller;

        isLoadingRef.current = true;
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

          // Check if request was aborted or overwritten
          if (controller.signal.aborted || requestId !== lastRequestId.current) {
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
          // Check if request was aborted or overwritten
          if (controller.signal.aborted || requestId !== lastRequestId.current) {
            return;
          }
          console.error("Error searching items:", error);
          setItems([]);
        } finally {
          if (!controller.signal.aborted && requestId === lastRequestId.current) {
            isLoadingRef.current = false;
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
    if (isLoadingRef.current || isLoadingMoreRef.current || !hasMore || !loadMore) return;

    const requestId = ++lastRequestId.current;
    isLoadingMoreRef.current = true;
    setIsLoading(true); // Still use state for UI spinner
    try {
      const newItems = await loadMore(skip, searchQuery || undefined);
      
      if (requestId !== lastRequestId.current) return;

      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...newItems]);
        setSkip((prev) => prev + newItems.length);
        setHasMore(newItems.length >= pageSize);
      }
    } catch (error) {
      if (requestId !== lastRequestId.current) return;
      console.error("Error loading more items:", error);
    } finally {
      if (requestId === lastRequestId.current) {
        isLoadingMoreRef.current = false;
        setIsLoading(false);
      }
    }
  }, [hasMore, skip, searchQuery, loadMore, pageSize]);

  // Handle dropdown open/close events from Radix Popover
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      closeReasonRef.current = null;
    }
  };

  // Trigger loading when dropdown opens (handles both Radix and programmatic triggers)
  useEffect(() => {
    if (isOpen) {
      closeReasonRef.current = null;
      setActiveIndex(-1);
      if (items.length === 0 && !isLoadingRef.current) {
        loadInitialItems();
      }
    } else {
      setSearchQuery("");
      setActiveIndex(-1);
    }
  }, [isOpen, items.length, loadInitialItems]);

  // Handle scroll for pagination
  useEffect(() => {
    if (!isOpen || !listRef.current || !loadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingRef.current &&
          !isLoadingMoreRef.current
        ) {
          loadMoreItems();
        }
      },
      {
        threshold: 0.1,
        root: listRef.current,
      },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => observer.disconnect();
  }, [isOpen, hasMore, loadMore, loadMoreItems]);



  // Find selected item display value
  const selectedItem = items.find((item) => getItemValue(item) === value);
  const displayValue = selectedItem
    ? getDisplayValue(selectedItem)
    : value || "";

  // Filter items based on search query (client-side filtering for display)
  const filteredItems = (() => {
    const trimmed = searchQuery.trim();
    if (trimmed === displayValue || trimmed === value || !trimmed) {
      return items;
    }
    const lower = trimmed.toLowerCase();
    return items.filter((item) => {
      const code = (item.Code || item.No || "").toLowerCase();
      const name = (item.Name || item.Description || "").toLowerCase();
      return code.includes(lower) || name.includes(lower);
    });
  })();

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const itemElements = listElement.querySelectorAll('[role="option"]');
      const activeElement = itemElements[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, isOpen]);

  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && activeIndex >= 0 && activeIndex < filteredItems.length) {
        closeReasonRef.current = "select";
        const item = filteredItems[activeIndex];
        onChange(getItemValue(item), item);
        setIsOpen(false);
        setSearchQuery("");
        setIsFocused(false);
      }
    } else if (e.key === "Escape") {
      closeReasonRef.current = "escape";
      setIsOpen(false);
      setSearchQuery("");
    } else if (e.key === "Tab") {
      closeReasonRef.current = "tab";
      setIsOpen(false);
    }
  };

  const handleListWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (element.scrollHeight <= element.clientHeight) return;

    // Ensure wheel/trackpad scroll works even when parent overlays intercept scroll.
    e.preventDefault();
    e.stopPropagation();
    element.scrollTop += e.deltaY;
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            value={isOpen ? searchQuery : displayValue}
            onChange={(e) => {
              const query = e.target.value;
              setSearchQuery(query);
              setActiveIndex(-1);
              if (!isOpen) setIsOpen(true);
              if (value) {
                onChange("", undefined);
              }
              performSearch(query);
            }}
            onFocus={(e) => {
              setIsFocused(true);
              if (!isOpen) {
                setSearchQuery(displayValue);
                if (!disabled) setIsOpen(true);
                setTimeout(() => e.target.select(), 0);
              }
            }}
            onBlur={() => {
              if (!isOpen) {
                setIsFocused(false);
                setSearchQuery("");
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "h-8 w-full bg-background text-xs font-medium",
              (value && !disabled) ? "pr-16" : "pr-8",
              hasError && (errorClass || "border-destructive focus-visible:ring-destructive"),
              className
            )}
            onClick={() => {
              if (!isOpen && !disabled) setIsOpen(true);
            }}
          />
          <div className="absolute right-0 top-0 flex h-full items-center gap-1.5 px-3">
            {value && !disabled && (
              <div
                role="button"
                tabIndex={0}
                className="hover:text-foreground p-1 text-muted-foreground transition-colors hover:bg-muted rounded-full pointer-events-auto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("", undefined);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                <X className="h-3 w-3" />
              </div>
            )}
            {isLoading && items.length === 0 ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 opacity-40" />
            )}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="flex max-h-(--radix-popover-content-available-height,80vh) min-h-0 w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] min-w-[320px] flex-col overflow-hidden p-0 shadow-xl"
        align="start"
        collisionPadding={8}
        onPointerDownOutside={() => {
          closeReasonRef.current = "clickOutside";
        }}
        onCloseAutoFocus={(e) => {
          if (closeReasonRef.current === "tab" || closeReasonRef.current === "clickOutside") {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          inputRef.current?.focus();
        }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {searchQuery && (
            <div className="bg-muted/40 border-b px-2.5 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
              <span className="truncate">Searching for: <span className="font-semibold text-foreground">"{searchQuery}"</span></span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  performSearch("");
                }}
                className="text-[9px] hover:text-foreground text-muted-foreground ml-2 shrink-0 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
          {/* Items List */}

          {/* Items List */}
          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1"
            style={{ WebkitOverflowScrolling: "touch" }}
            data-scroll-lock-ignore
            onWheel={handleListWheel}
          >
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-sm px-2">
                No items found
              </div>
            ) : (
              <>
                {filteredItems.map((item, idx) => {
                  const itemValue = getItemValue(item);
                  const isSelected = value === itemValue;
                  const isFocused = activeIndex === idx;
                  return (
                    <div
                      key={itemValue}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "relative flex cursor-default items-start rounded-sm px-2 py-2 text-sm outline-none select-none",
                        isSelected
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                          : isFocused ? "bg-accent text-accent-foreground" : "hover:bg-muted hover:text-foreground",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        closeReasonRef.current = "select";
                        onChange(itemValue, item);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="min-w-0 flex-1 text-left">
                        {/* Two-line format: No on first line, Description/Name on second */}
                        {item.No && (item.Description || item.Name) ? (
                          <div className="flex flex-col">
                            <span className={cn("font-medium", isSelected ? "text-primary-foreground" : "text-foreground")}>
                              {item.No}
                            </span>
                            <span className={cn("text-xs wrap-break-word", isSelected ? "text-primary-foreground/80" : isFocused ? "text-accent-foreground/80" : "text-muted-foreground")}>
                              {item.Description || item.Name || ""}
                            </span>
                            {item.FA_Location_Code && (
                              <span className={cn("mt-0.5 text-[10px] font-medium uppercase", isSelected ? "text-primary-foreground/70" : isFocused ? "text-accent-foreground/70" : "text-primary")}>
                                FA Location Code: {item.FA_Location_Code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={cn("wrap-break-word font-medium", isSelected ? "text-primary-foreground" : "text-foreground")}>
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
                <div ref={sentinelRef} className="h-px w-full" />
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
