"use client";

/**
 * DimensionSelect component
 * Smart dropdown for Branch, LOB, and LOC dimension values
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ChevronDownIcon, CheckIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  getBranches,
  getBranchesPage,
  getLOBs,
  getLOCs,
  getLOCsPage,
  getEmployees,
  getEmployeesPage,
  getAssignments,
  getAssignmentsPage,
  type DimensionValue,
} from "@/lib/api/services/dimension.service";

type DimensionType = "BRANCH" | "LOB" | "LOC" | "EMPLOYEE" | "ASSIGNMENT";

interface DimensionSelectProps {
  dimensionType: DimensionType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
}

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 3;
const INITIAL_LOAD_COUNT = 20;
const PAGE_SIZE = 30;

export function DimensionSelect({
  dimensionType,
  value,
  onChange,
  placeholder = "",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
}: DimensionSelectProps) {
  const [items, setItems] = useState<DimensionValue[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevDimensionTypeRef = useRef<DimensionType | undefined>(dimensionType);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if this dimension supports search (LOB doesn't)
  const supportsSearch = dimensionType !== "LOB";

  // Load initial items when dropdown opens
  const loadInitialItems = useCallback(async () => {
    setIsLoading(true);
    try {
      let result: DimensionValue[];
      switch (dimensionType) {
        case "BRANCH":
          result = await getBranches();
          break;
        case "LOB":
          result = await getLOBs();
          break;
        case "LOC":
          result = await getLOCs();
          break;
        case "EMPLOYEE":
          result = await getEmployees();
          break;
        case "ASSIGNMENT":
          result = await getAssignments();
          break;
        default:
          result = [];
      }
      setItems(result);
      setSkip(result.length);
      setHasMore(result.length >= INITIAL_LOAD_COUNT);
    } catch (error) {
      console.error(`Error loading ${dimensionType}:`, error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [dimensionType]);

  // Search with debounce (only for BRANCH and LOC)
  const performSearch = useCallback(
    async (query: string) => {
      if (!supportsSearch) {
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

      // If query is too short (less than 3 chars), don't make any API call
      if (query.length < MIN_SEARCH_LENGTH) {
        setSearchQuery(query);
        // Don't make any API call - just show what we already have
        return;
      }

      // Debounce the search (300ms)
      debounceTimerRef.current = setTimeout(async () => {
        // Create new AbortController for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
          let result: DimensionValue[];
          switch (dimensionType) {
            case "BRANCH":
              result = await getBranches(query);
              break;
            case "LOC":
              result = await getLOCs(query);
              break;
            case "EMPLOYEE":
              result = await getEmployees(query);
              break;
            case "ASSIGNMENT":
              result = await getAssignments(query);
              break;
            default:
              result = [];
          }

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
          console.error(`Error searching ${dimensionType}:`, error);
          setItems([]);
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [dimensionType, supportsSearch],
  );

  // Reload items when dimensionType changes
  useEffect(() => {
    // Only reload if dimensionType actually changed
    if (prevDimensionTypeRef.current === dimensionType) {
      return;
    }

    prevDimensionTypeRef.current = dimensionType;

    // Clear items and search state when dimension type changes
    setItems([]);
    setSearchQuery("");
    setSkip(0);
    setHasMore(true);

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Load initial items for the new dimension type
    const loadItems = async () => {
      setIsLoading(true);
      try {
        let result: DimensionValue[];
        switch (dimensionType) {
          case "BRANCH":
            result = await getBranches();
            break;
          case "LOB":
            result = await getLOBs();
            break;
          case "LOC":
            result = await getLOCs();
            break;
          case "EMPLOYEE":
            result = await getEmployees();
            break;
          case "ASSIGNMENT":
            result = await getAssignments();
            break;
          default:
            result = [];
        }
        setItems(result);
        setSkip(result.length);
        setHasMore(result.length >= INITIAL_LOAD_COUNT);
      } catch (error) {
        console.error(`Error loading ${dimensionType}:`, error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();

    // Clear value when dimension type changes
    if (value) {
      onChange("");
    }
  }, [dimensionType, value, onChange]);

  // Load more items (pagination) - only for BRANCH and LOC
  const loadMore = useCallback(async () => {
    if (!supportsSearch || isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      let result: DimensionValue[];
      switch (dimensionType) {
        case "BRANCH":
          result = await getBranchesPage(skip, searchQuery || undefined);
          break;
        case "LOC":
          result = await getLOCsPage(skip, searchQuery || undefined);
          break;
        case "EMPLOYEE":
          result = await getEmployeesPage(skip, searchQuery || undefined);
          break;
        case "ASSIGNMENT":
          result = await getAssignmentsPage(skip, searchQuery || undefined);
          break;
        default:
          result = [];
      }

      if (result.length > 0) {
        setItems((prev) => {
          // Filter out duplicates by Code
          const existingCodes = new Set(prev.map((item) => item.Code));
          const newItems = result.filter(
            (item) => !existingCodes.has(item.Code),
          );
          return [...prev, ...newItems];
        });
        setSkip((prev) => prev + result.length);
        setHasMore(result.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error(`Error loading more ${dimensionType}:`, error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [dimensionType, supportsSearch, isLoading, hasMore, skip, searchQuery]);

  // Handle dropdown open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setFocusedIndex(-1);
      if (items.length === 0) {
        loadInitialItems();
      }
    }
    if (!open) {
      setSearchQuery("");
      setSkip(0);
      setHasMore(true);
    }
  };

  // Handle scroll for pagination
  useEffect(() => {
    if (!isOpen || !listRef.current || !supportsSearch) return;

    const listElement = listRef.current;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = listElement;
      if (
        scrollHeight - scrollTop <= clientHeight * 1.5 &&
        hasMore &&
        !isLoading
      ) {
        loadMore();
      }
    };

    listElement.addEventListener("scroll", handleScroll);
    return () => listElement.removeEventListener("scroll", handleScroll);
  }, [isOpen, hasMore, isLoading, loadMore, supportsSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Find selected item display value
  const selectedItem = items.find((item) => item.Code === value);
  const displayValue = selectedItem
    ? selectedItem.Name
      ? `${selectedItem.Code} - ${selectedItem.Name}`
      : selectedItem.Code
    : value || "";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setFocusedIndex((prev) => 
          prev < items.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen) {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === "Enter") {
      if (isOpen && focusedIndex >= 0) {
        e.preventDefault();
        const item = items[focusedIndex];
        if (item) {
          onChange(item.Code);
          setIsOpen(false);
          setSearchQuery("");
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSearchQuery("");
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const itemElement = listElement.children[focusedIndex] as HTMLElement;
      if (itemElement) {
        itemElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, isOpen]);

  // Calculate max width needed for dropdown based on items
  const calculateDropdownWidth = () => {
    if (items.length === 0) return "280px";
    const codeLengths = items.map((item) => item.Code?.length || 0);
    const nameLengths = items.map((item) => item.Name?.length || 0);
    const maxCodeLength = codeLengths.length > 0 ? Math.max(...codeLengths) : 0;
    const maxNameLength = nameLengths.length > 0 ? Math.max(...nameLengths) : 0;
    // Estimate: code (8ch) + padding + name (max 40ch) + check icon + padding
    // Use min-width to ensure readability, max-width to prevent overflow
    const estimatedWidth = Math.max(
      280,
      Math.min(500, (maxCodeLength + maxNameLength) * 8 + 80),
    );
    return `${estimatedWidth}px`;
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            value={isOpen ? searchQuery : displayValue}
            onChange={(e) => {
              const query = e.target.value;
              setSearchQuery(query);
              if (!isOpen) setIsOpen(true);
              performSearch(query);
            }}
            onFocus={() => {
              if (!isOpen) {
                setSearchQuery("");
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "h-9 w-full pr-10 text-sm font-normal shadow-sm",
              !value && !isOpen && "text-muted-foreground",
              className,
              errorClass,
            )}
            data-field-error={hasError}
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
                  onChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange("");
                  }
                }}
              >
                <X className="h-3 w-3" />
              </div>
            )}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            )}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="flex max-h-(--radix-popover-content-available-height,80vh) min-h-0 w-auto max-w-125 min-w-70 flex-col overflow-hidden p-0"
        align="start"
        style={{ width: calculateDropdownWidth() }}
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
          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1"
          >
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                {supportsSearch && searchQuery.length < MIN_SEARCH_LENGTH && searchQuery.length > 0
                  ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
                  : "No items found"}
              </div>
            ) : (
              <>
                {items.map((item, index) => (
                  <div
                    key={item.Code}
                    className={cn(
                      "relative flex cursor-default items-start rounded-sm px-2 py-2 text-sm outline-none select-none",
                      value === item.Code && "bg-muted",
                      focusedIndex === index && "bg-accent text-accent-foreground",
                    )}
                    onClick={() => {
                      if (value === item.Code) {
                        onChange("");
                      } else {
                        onChange(item.Code);
                      }
                      setIsOpen(false);
                      setSearchQuery("");
                      inputRef.current?.focus();
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <CheckIcon
                      className={cn(
                        "mt-0.5 mr-2 h-4 w-4 shrink-0",
                        value === item.Code ? "opacity-100" : "opacity-0",
                        focusedIndex === index && "text-accent-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className={cn(
                        "text-foreground font-medium",
                        focusedIndex === index && "text-accent-foreground"
                      )}>
                        {item.Code}
                      </div>
                      {item.Name && (
                        <div className={cn(
                          "text-muted-foreground mt-0.5 text-xs wrap-break-word",
                          focusedIndex === index && "text-accent-foreground/80"
                        )}>
                          {item.Name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && items.length > 0 && (
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
