"use client";

/**
 * CascadingDimensionSelect component
 * Cascading dropdowns for LOB → Branch → LOC based on WebUserSetup API
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
} from "@/components/ui/popover";
import {
  getLOBsFromUserSetup,
  getBranchesFromUserSetup,
  getLOCsFromUserSetup,
  type DimensionValue,
} from "@/lib/api/services/dimension.service";

type CascadingDimensionType = "LOB" | "BRANCH" | "LOC";

interface CascadingDimensionSelectProps {
  dimensionType: CascadingDimensionType;
  value: string;
  onChange: (value: string) => void;
  /** Called with the full item when the user selects an option (includes Name) */
  onSelectItem?: (item: DimensionValue) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
  /** When true and only one option exists, show as compact label instead of dropdown */
  compactWhenSingle?: boolean;
  // Parent values for cascading
  lobValue?: string;
  branchValue?: string;
  userId?: string;
}

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 3;

export function CascadingDimensionSelect({
  dimensionType,
  value,
  onChange,
  onSelectItem,
  placeholder = "",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
  compactWhenSingle = false,
  lobValue,
  branchValue,
  userId,
}: CascadingDimensionSelectProps) {
  const [items, setItems] = useState<DimensionValue[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load items based on dimension type and parent values
  const loadItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      let result: DimensionValue[] = [];

      switch (dimensionType) {
        case "LOB":
          result = await getLOBsFromUserSetup(userId);
          break;
        case "BRANCH":
          if (!lobValue) {
            result = [];
          } else {
            result = await getBranchesFromUserSetup(lobValue, userId);
          }
          break;
        case "LOC":
          if (!lobValue || !branchValue) {
            result = [];
          } else {
            result = await getLOCsFromUserSetup(lobValue, branchValue, userId);
          }
          break;
      }

      setItems(result);
    } catch (error) {
      console.error(`Error loading ${dimensionType}:`, error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [dimensionType, lobValue, branchValue, userId]);

  // Clear value if parent dependency is not met (but don't reload items here)
  useEffect(() => {
    if (dimensionType === "BRANCH" && !lobValue && value) {
      onChange("");
    }
    if (dimensionType === "LOC" && (!lobValue || !branchValue) && value) {
      onChange("");
    }
  }, [dimensionType, lobValue, branchValue, value, onChange]);

  // Only reload items when parent values change (not on every render)
  useEffect(() => {
    // Only load if dropdown is open or items are empty
    if (isOpen || items.length === 0) {
      loadItems();
    }
  }, [dimensionType, lobValue, branchValue, userId, isOpen]);

  // Auto-select when single option and compactWhenSingle
  useEffect(() => {
    if (compactWhenSingle && items.length === 1 && !value && items[0]?.Code) {
      onChange(items[0].Code);
      onSelectItem?.(items[0]);
    }
  }, [compactWhenSingle, items, value, onChange, onSelectItem]);

  // Search with debounce
  const performSearch = useCallback(
    async (query: string) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // If query is too short, show all items
      if (query.length < MIN_SEARCH_LENGTH) {
        setSearchQuery(query);
        loadItems();
        return;
      }

      // Debounce the search
      debounceTimerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
          // Load all items first, then filter client-side
          await loadItems();

          // Filter items client-side based on search query
          setItems((prev) => {
            const filtered = prev.filter((item) => {
              const codeMatch = item.Code?.toLowerCase().includes(
                query.toLowerCase(),
              );
              const nameMatch = item.Name?.toLowerCase().includes(
                query.toLowerCase(),
              );
              return codeMatch || nameMatch;
            });
            return filtered;
          });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          console.error(`Error searching ${dimensionType}:`, error);
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [dimensionType, loadItems],
  );

  // Handle dropdown open
  const handleOpenChange = (open: boolean) => {
    if (disabled) return;
    setIsOpen(open);
    if (open) {
      // Only load if items are empty or parent values changed
      if (items.length === 0) {
        loadItems();
      }
    } else {
      setSearchQuery("");
      // Don't reload when closing - it's unnecessary
    }
  };

  // Check if field should be disabled
  const isFieldDisabled =
    disabled ||
    (dimensionType === "BRANCH" && !lobValue) ||
    (dimensionType === "LOC" && (!lobValue || !branchValue));

  // Find selected item display value
  const selectedItem = items.find((item) => item.Code === value);
  const displayValue = selectedItem
    ? selectedItem.Name
      ? `${selectedItem.Code} - ${selectedItem.Name}`
      : selectedItem.Code
    : disabled && value
      ? "None"
      : value || "";

  // Reset focusedIndex when filteredItems changes or dropdown closes
  useEffect(() => {
    setFocusedIndex(-1);
    itemRefs.current = [];
  }, [searchQuery, isOpen]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  // Filter items based on search query
  const filteredItems =
    searchQuery.length >= MIN_SEARCH_LENGTH
      ? items.filter((item) => {
          const codeMatch = item.Code?.toLowerCase().includes(
            searchQuery.toLowerCase(),
          );
          const nameMatch = item.Name?.toLowerCase().includes(
            searchQuery.toLowerCase(),
          );
          return codeMatch || nameMatch;
        })
      : items;

  const showAsLabel =
    compactWhenSingle && items.length === 1 && value === items[0]?.Code;

  if (showAsLabel) {
    return (
      <span className={cn("text-foreground inline text-sm", className)}>
        {items[0].Name ? `${items[0].Code} - ${items[0].Name}` : items[0].Code}
      </span>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={isFieldDisabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={placeholder || dimensionType}
          className={cn(
            "h-9 w-full justify-between text-sm font-normal shadow-sm",
            !value && "text-muted-foreground",
            className,
            errorClass,
          )}
          data-field-error={hasError}
        >
          <span className="truncate">
            {isFieldDisabled && dimensionType === "BRANCH" && !lobValue
              ? "Select LOB first"
              : isFieldDisabled &&
                  dimensionType === "LOC" &&
                  (!lobValue || !branchValue)
                ? "Select Branch first"
                : !isFieldDisabled && items.length === 0 && !isLoading && userId
                  ? `No ${dimensionType} found. Please contact IT.`
                  : displayValue || (disabled ? "None" : placeholder)}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {value && !disabled && (
              <div
                role="button"
                tabIndex={0}
                className="hover:text-foreground p-1 text-muted-foreground transition-colors hover:bg-muted rounded-full"
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
            <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-40" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex max-h-(--radix-popover-content-available-height,80vh) min-h-0 w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] min-w-[320px] flex-col overflow-hidden p-0"
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
          <div className="shrink-0 border-b p-2">
            <Input
              placeholder="Search by Code or Name..."
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                performSearch(query);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setFocusedIndex((prev) =>
                    Math.min(prev + 1, filteredItems.length - 1),
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setFocusedIndex((prev) => Math.max(prev - 1, 0));
                } else if (e.key === "Enter" && focusedIndex >= 0) {
                  e.preventDefault();
                  const item = filteredItems[focusedIndex];
                  if (item) {
                    onChange(item.Code);
                    onSelectItem?.(item);
                    setIsOpen(false);
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setIsOpen(false);
                }
              }}
              className="h-8 text-sm"
              autoFocus
              aria-autocomplete="list"
              aria-controls="cascading-select-listbox"
              aria-activedescendant={
                focusedIndex >= 0
                  ? `cascading-option-${filteredItems[focusedIndex]?.Code}`
                  : undefined
              }
            />
          </div>
          <div
            ref={listRef}
            id="cascading-select-listbox"
            role="listbox"
            aria-label={placeholder || dimensionType}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
          >
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                {isFieldDisabled
                  ? dimensionType === "BRANCH"
                    ? "Select LOB first"
                    : "Select Branch first"
                  : searchQuery.length < MIN_SEARCH_LENGTH && items.length === 0
                    ? `No ${dimensionType} found. Please contact IT.`
                    : searchQuery.length < MIN_SEARCH_LENGTH
                      ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
                      : "No items found"}
              </div>
            ) : (
              <>
                {filteredItems.map((item, index) => (
                  <div
                    key={item.Code}
                    id={`cascading-option-${item.Code}`}
                    role="option"
                    aria-selected={value === item.Code}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className={cn(
                      "hover:bg-muted/50 relative flex cursor-default items-start rounded-sm px-2 py-2 text-sm outline-none select-none",
                      value === item.Code && "bg-muted",
                      focusedIndex === index && "bg-accent text-accent-foreground",
                    )}
                    onClick={() => {
                      if (value === item.Code) {
                        onChange("");
                      } else {
                        onChange(item.Code);
                        onSelectItem?.(item);
                      }
                      setIsOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mt-0.5 mr-2 h-4 w-4 shrink-0",
                        value === item.Code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground font-medium wrap-break-word">
                        {item.Code}
                      </div>
                      {item.Name && (
                        <div className="text-muted-foreground mt-0.5 text-xs wrap-break-word">
                          {item.Name}
                        </div>
                      )}
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
