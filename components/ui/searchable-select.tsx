"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onSearch?: (query: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  className?: string;
  /** Allow user to enter custom values not in the options list */
  allowCustomValue?: boolean;
  /** Allow multiple selection */
  isMulti?: boolean;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found",
  disabled = false,
  isLoading = false,
  onSearch,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  className,
  allowCustomValue = false,
  isMulti = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get the selected options' labels
  const values = isMulti ? (value ? value.split("|") : []) : (value ? [value] : []);
  const selectedOptions = options.filter((opt) => values.includes(opt.value));
  
  const displayLabel = isMulti
    ? values.length > 1
      ? `${values.length} items selected`
      : values.length === 1
        ? (selectedOptions[0]?.label ?? values[0])
        : placeholder
    : selectedOptions[0]?.label ??
      (allowCustomValue && value
        ? value
        : disabled && value
          ? "None"
          : undefined);

  // Handle search with debounce
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    if (onSearch) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce search
      searchTimeoutRef.current = setTimeout(() => {
        onSearch(query);
      }, 300);
    }
  };

  // Filter options locally
  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle infinite loading with Sentinel Pattern
  React.useEffect(() => {
    if (!open || !onLoadMore || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { 
        threshold: 0.1,
        root: listRef.current,
        rootMargin: "100px",
      },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [open, onLoadMore, hasMore, isLoadingMore]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight <= target.clientHeight) return;

    // Keep wheel scrolling within the dropdown list and out of parent overlays.
    e.preventDefault();
    e.stopPropagation();
    target.scrollTop += e.deltaY;
  };

  // Reset search when popover closes - REMOVED to keep search persistent
  // React.useEffect(() => {
  //   if (!open) {
  //     setSearchQuery("");
  //     if (onSearch) {
  //       onSearch("");
  //     }
  //   }
  // }, [open, onSearch]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle Enter key for custom value submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && allowCustomValue && searchQuery.trim()) {
      e.preventDefault();
      const trimmedVal = searchQuery.trim();
      if (isMulti) {
        const newValues = values.includes(trimmedVal)
          ? values.filter((v) => v !== trimmedVal)
          : [...values, trimmedVal];
        onValueChange(newValues.join("|"));
      } else {
        onValueChange(trimmedVal);
        setOpen(false);
      }
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          setSearchQuery("");
          if (onSearch) onSearch("");
        }
      }}
      modal={false}
    >
      <PopoverAnchor asChild>
        <div
          onClick={() => !disabled && !isLoading && setOpen(true)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring cursor-pointer",
            (disabled || isLoading) && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          {isMulti && selectedOptions.length > 0 && !open && !searchQuery ? (
            <div className="flex flex-1 flex-wrap gap-1 overflow-hidden truncate">
               <span className="truncate text-sm">{selectedOptions.length} items selected</span>
            </div>
          ) : (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                handleSearchChange(e.target.value);
                if (!open) setOpen(true);
              }}
              onFocus={() => !disabled && !isLoading && setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading && !open ? "Loading..." : (displayLabel || placeholder)}
              disabled={disabled || (isLoading && !open)}
              className="w-full bg-transparent focus:outline-none text-sm placeholder:text-foreground/90 truncate cursor-text"
            />
          )}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                  if (onSearch) onSearch("");
                }}
                className="hover:text-foreground p-1 text-muted-foreground transition-colors hover:bg-muted rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            ) : value && !disabled ? (
              <div
                role="button"
                tabIndex={0}
                className="hover:text-foreground p-1 text-muted-foreground transition-colors hover:bg-muted rounded-full"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onValueChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onValueChange("");
                  }
                }}
              >
                <X className="h-3 w-3" />
              </div>
            ) : (
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={disabled || isLoading}
                  className="p-1 text-muted-foreground/50 hover:text-foreground"
                >
                  <ChevronsUpDown className="h-4 w-4" />
                </button>
              </PopoverTrigger>
            )}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="flex max-h-[260px] min-h-0 w-(--radix-popover-anchor-width) max-w-[calc(100vw-2rem)] min-w-[320px] flex-col overflow-hidden p-0"
        align="start"
        sideOffset={4}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Options List */}
          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto p-1"
            onWheel={handleWheel}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground ml-2 text-sm">
                  Loading...
                </span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-2">
                {allowCustomValue && searchQuery.trim() ? (
                  <div
                    className="hover:bg-accent hover:text-accent-foreground bg-primary/10 relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm font-medium transition-colors outline-none select-none"
                    onClick={() => {
                      const trimmedVal = searchQuery.trim();
                      if (isMulti) {
                        const newValues = values.includes(trimmedVal)
                          ? values.filter((v) => v !== trimmedVal)
                          : [...values, trimmedVal];
                        onValueChange(newValues.join("|"));
                      } else {
                        onValueChange(value === trimmedVal ? "" : trimmedVal);
                        setOpen(false);
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        values.includes(searchQuery.trim())
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span>
                      Use &quot;{searchQuery.trim()}&quot; as custom value
                    </span>
                  </div>
                ) : (
                  <div className="text-muted-foreground py-4 text-center text-sm">
                    {emptyText}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Custom value option - ALWAYS shown at top when typing with allowCustomValue */}
                {allowCustomValue && searchQuery.trim() && (
                  <div
                    className="hover:bg-accent hover:text-accent-foreground bg-primary/10 relative mb-1 flex cursor-pointer items-center rounded-sm border-b px-2 py-1.5 text-sm font-medium transition-colors outline-none select-none"
                    onClick={() => {
                      const trimmedVal = searchQuery.trim();
                      if (isMulti) {
                        const newValues = values.includes(trimmedVal)
                          ? values.filter((v) => v !== trimmedVal)
                          : [...values, trimmedVal];
                        onValueChange(newValues.join("|"));
                      } else {
                        onValueChange(value === trimmedVal ? "" : trimmedVal);
                        setOpen(false);
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        values.includes(searchQuery.trim())
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span>
                      Use &quot;{searchQuery.trim()}&quot; as custom value
                    </span>
                  </div>
                )}
                {filteredOptions.map((option) => {
                  const isSelected = values.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "group relative flex cursor-pointer items-start rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none",
                        isSelected
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground",
                      )}
                      onClick={() => {
                        if (isMulti) {
                          const newValues = isSelected
                            ? values.filter((v) => v !== option.value)
                            : [...values, option.value];
                          onValueChange(newValues.join("|"));
                        } else {
                          onValueChange(isSelected ? "" : option.value);
                          setTimeout(() => setOpen(false), 0);
                        }
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span
                        className="block w-full truncate text-left group-hover:wrap-break-word group-hover:whitespace-normal"
                        title={option.label}
                      >
                        {option.label}
                      </span>
                    </div>
                  );
                })}

                {/* Sentinel div for infinite scroll */}
                <div ref={sentinelRef} className="h-1 w-full" />

                {/* Load More Indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground ml-2 text-xs">
                      Loading more...
                    </span>
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
