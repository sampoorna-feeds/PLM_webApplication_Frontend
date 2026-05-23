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
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  getLOBsFromUserSetup,
  getBranchesFromUserSetup,
  getLOCsFromUserSetup,
  getAllBranchesFromUserSetup,
  getLOCsForBranchFromUserSetup,
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
  const inputRef = useRef<HTMLInputElement>(null);
  const prevItemsRef = useRef<DimensionValue[]>(items);

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
            result = await getAllBranchesFromUserSetup(userId);
          } else {
            result = await getBranchesFromUserSetup(lobValue, userId);
          }
          break;
        case "LOC":
          if (!lobValue && branchValue) {
            result = await getLOCsForBranchFromUserSetup(branchValue, userId);
          } else if (!lobValue || !branchValue) {
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

  // Clear value if parent dependency is not met
  useEffect(() => {
    if (dimensionType === "LOC" && !branchValue && value) {
      onChange("");
    }
  }, [dimensionType, lobValue, branchValue, value, onChange]);

  // Only reload items when parent values change (not on every render)
  useEffect(() => {
    if (isOpen || items.length === 0) {
      loadItems();
    }
  }, [dimensionType, lobValue, branchValue, userId, isOpen]);

  // Auto-select when single option
  useEffect(() => {
    const itemsChanged = prevItemsRef.current !== items;
    prevItemsRef.current = items;
    if (itemsChanged && compactWhenSingle && items.length === 1 && !value && items[0]?.Code) {
      onChange(items[0].Code);
      onSelectItem?.(items[0]);
    }
  }, [compactWhenSingle, items, value, onChange, onSelectItem]);

  // Search logic (client-side filtering)
  const performSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!isOpen) setIsOpen(true);
    },
    [isOpen],
  );

  // Handle dropdown open
  const handleOpenChange = (open: boolean) => {
    if (disabled) return;
    setIsOpen(open);
    if (open) {
      setFocusedIndex(-1);
      if (items.length === 0) {
        loadItems();
      }
    } else {
      setSearchQuery("");
    }
  };

  // Check if field should be disabled
  const isFieldDisabled =
    disabled || (dimensionType === "LOC" && !branchValue);

  // Find selected item display value
  const selectedItem = items.find((item) => item.Code === value);
  const displayValue = selectedItem
    ? selectedItem.Name
      ? `${selectedItem.Code} - ${selectedItem.Name}`
      : selectedItem.Code
    : disabled && value
      ? "None"
      : value || "";

  // Filter items based on search query
  const filteredItems =
    searchQuery.length > 0
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isFieldDisabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setFocusedIndex((prev) =>
          Math.min(prev + 1, filteredItems.length - 1),
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen) {
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === "Enter") {
      if (isOpen && focusedIndex >= 0) {
        e.preventDefault();
        const item = filteredItems[focusedIndex];
        if (item) {
          onChange(item.Code);
          onSelectItem?.(item);
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
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            value={isOpen ? searchQuery : displayValue}
            onChange={(e) => performSearch(e.target.value)}
            onFocus={() => {
              if (!isOpen) {
                setSearchQuery("");
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isFieldDisabled && dimensionType === "LOC" && !branchValue
                ? "Select Branch first"
                : placeholder
            }
            disabled={isFieldDisabled}
            className={cn(
              "h-9 w-full pr-16 text-sm font-normal shadow-sm",
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
        className="flex max-h-(--radix-popover-content-available-height,80vh) min-h-0 w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] min-w-[320px] flex-col overflow-hidden p-0"
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
          <div
            ref={listRef}
            id="cascading-select-listbox"
            role="listbox"
            aria-label={placeholder || dimensionType}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1"
          >
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                {isFieldDisabled
                  ? "Select Branch first"
                  : searchQuery.length < MIN_SEARCH_LENGTH && items.length === 0
                    ? `No ${dimensionType} found.`
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
                    onMouseDown={(e) => e.preventDefault()}
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
                        onSelectItem?.(item);
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
                        "text-foreground font-medium wrap-break-word",
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
