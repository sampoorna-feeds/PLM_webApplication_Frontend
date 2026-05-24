"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
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
  const [activeIndex, setActiveIndex] = React.useState(-1);
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

  // Reset active item when search or options change
  React.useEffect(() => {
    setActiveIndex(-1);
  }, [searchQuery, options]);

  // Scroll active item into view
  React.useEffect(() => {
    if (open && activeIndex >= 0 && listRef.current) {
      const listElement = listRef.current;
      const itemElements = listElement.querySelectorAll('[role="option"]');
      const activeElement = itemElements[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, open]);

  // Handle Enter key for custom value submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasCustomValueOption = !!(allowCustomValue && searchQuery.trim());
    const totalOptions = filteredOptions.length + (hasCustomValueOption ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, totalOptions - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      
      if (activeIndex === 0 && hasCustomValueOption) {
        // Custom value is selected
        const trimmedVal = searchQuery.trim();
        if (isMulti) {
          const newValues = values.includes(trimmedVal)
            ? values.filter((v) => v !== trimmedVal)
            : [...values, trimmedVal];
          onValueChange(newValues.join("|"));
        } else {
          onValueChange(trimmedVal);
          setOpen(false);
          setIsFocused(false);
        }
      } else if (activeIndex >= 0) {
        // Find which option was selected
        const optionIndex = hasCustomValueOption ? activeIndex - 1 : activeIndex;
        if (optionIndex >= 0 && optionIndex < filteredOptions.length) {
          const option = filteredOptions[optionIndex];
          if (isMulti) {
            const isSelected = values.includes(option.value);
            const newValues = isSelected
              ? values.filter((v) => v !== option.value)
              : [...values, option.value];
            onValueChange(newValues.join("|"));
          } else {
            onValueChange(values.includes(option.value) ? "" : option.value);
            setOpen(false);
            setIsFocused(false);
          }
        }
      } else if (hasCustomValueOption) {
        // Fallback
        const trimmedVal = searchQuery.trim();
        if (isMulti) {
          const newValues = values.includes(trimmedVal)
            ? values.filter((v) => v !== trimmedVal)
            : [...values, trimmedVal];
          onValueChange(newValues.join("|"));
        } else {
          onValueChange(trimmedVal);
          setOpen(false);
          setIsFocused(false);
        }
      }
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Popover
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setIsFocused(false);
          setSearchQuery("");
          if (onSearch) onSearch("");
        }
      }}
      modal={false}
    >
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            value={(isFocused || open) ? searchQuery : (displayLabel || "")}
            onChange={(e) => {
              const query = e.target.value;
              handleSearchChange(query);
              setActiveIndex(-1);
              if (!open) setOpen(true);
              if (!isMulti && value && !allowCustomValue) {
                onValueChange("");
              }
            }}
            onFocus={(e) => {
              setIsFocused(true);
              setSearchQuery(displayLabel || "");
              if (!open && !disabled && !isLoading) setOpen(true);
              setTimeout(() => e.target.select(), 0);
            }}
            onBlur={() => {
              if (!open) {
                setIsFocused(false);
                setSearchQuery("");
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              "h-8 w-full bg-background pr-10 text-xs font-medium truncate",
              className
            )}
            onClick={() => {
              if (!open && !disabled && !isLoading) setOpen(true);
            }}
          />
          <div className="absolute right-0 top-0 flex h-full items-center gap-1 px-3">
            {value && !disabled && !isLoading && (
              <div
                role="button"
                tabIndex={0}
                className="hover:text-foreground p-1 text-muted-foreground transition-colors hover:bg-muted rounded-full pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onValueChange("");
                  if (onSearch) onSearch("");
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                <X className="h-3 w-3" />
              </div>
            )}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50 pointer-events-none" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
            )}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="flex max-h-(--radix-popover-content-available-height,80vh) min-h-0 w-(--radix-popover-anchor-width) max-w-[calc(100vw-2rem)] min-w-[320px] flex-col overflow-hidden p-0 shadow-xl"
        align="start"
        sideOffset={4}
        collisionPadding={8}
        onCloseAutoFocus={(e) => {
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
                  if (onSearch) onSearch("");
                }}
                className="text-[9px] hover:text-foreground text-muted-foreground ml-2 shrink-0 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
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
                    role="option"
                    aria-selected={values.includes(searchQuery.trim())}
                    onMouseDown={(e) => e.preventDefault()}
                    className={cn("relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm font-medium transition-colors outline-none select-none",
                      activeIndex === 0 ? "bg-accent text-accent-foreground" : "bg-primary/10 hover:bg-accent hover:text-accent-foreground"
                    )}
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
                  <div className="text-muted-foreground py-4 text-center text-sm px-2">
                    {searchQuery ? `No results found for "${searchQuery}"` : emptyText}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Custom value option - ALWAYS shown at top when typing with allowCustomValue */}
                {allowCustomValue && searchQuery.trim() && (
                  <div
                    role="option"
                    aria-selected={values.includes(searchQuery.trim())}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(0)}
                    className={cn(
                      "relative mb-1 flex cursor-pointer items-center rounded-sm border-b px-2 py-1.5 text-sm font-medium transition-colors outline-none select-none",
                      activeIndex === 0 ? "bg-accent text-accent-foreground" : "bg-primary/10 hover:bg-accent hover:text-accent-foreground"
                    )}
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
                {filteredOptions.map((option, idx) => {
                  const isSelected = values.includes(option.value);
                  const optionIndex = (allowCustomValue && searchQuery.trim() ? 1 : 0) + idx;
                  const isFocused = activeIndex === optionIndex;
                  return (
                    <div
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(optionIndex)}
                      className={cn(
                        "group relative flex cursor-pointer items-start rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none",
                        isSelected
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                          : isFocused ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
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
                      <div className="flex min-w-0 flex-1 flex-col text-left">
                        <span
                          className={cn(
                            "block w-full truncate font-medium group-hover:wrap-break-word group-hover:whitespace-normal",
                            isSelected ? "text-primary-foreground" : "text-foreground"
                          )}
                          title={option.label}
                        >
                          {option.label}
                        </span>
                        {option.description && (
                          <span
                            className={cn(
                              "text-xs truncate group-hover:wrap-break-word group-hover:whitespace-normal",
                              isSelected ? "text-primary-foreground/80" : isFocused ? "text-accent-foreground/80" : "text-muted-foreground"
                            )}
                            title={option.description}
                          >
                            {option.description}
                          </span>
                        )}
                      </div>
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
