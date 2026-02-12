"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
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
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get the selected option's label (or show value if custom)
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel =
    selectedOption?.label ?? (allowCustomValue && value ? value : undefined);

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

  // Filter options locally if no onSearch provided
  const filteredOptions = onSearch
    ? options
    : options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );

  // Handle scroll for infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;

    const target = e.target as HTMLDivElement;
    const scrollBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;

    // Load more when near bottom (within 50px)
    if (scrollBottom < 50) {
      onLoadMore();
    }
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
      onValueChange(searchQuery.trim());
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : displayLabel ? (
            <span className="truncate">{displayLabel}</span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex max-h-(--radix-popover-content-available-height,80vh) min-h-0 w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] min-w-[320px] flex-col overflow-hidden p-0"
        align="start"
        sideOffset={4}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Search Input */}
          <div className="flex shrink-0 items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={
                allowCustomValue
                  ? `${searchPlaceholder} (Enter to use custom)`
                  : searchPlaceholder
              }
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto p-1"
            onScroll={handleScroll}
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
                      onValueChange(searchQuery.trim());
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === searchQuery.trim()
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
                      onValueChange(searchQuery.trim());
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === searchQuery.trim()
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span>
                      Use &quot;{searchQuery.trim()}&quot; as custom value
                    </span>
                  </div>
                )}
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "hover:bg-accent hover:text-accent-foreground relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none",
                      value === option.value &&
                        "bg-accent text-accent-foreground",
                    )}
                    onClick={() => {
                      onValueChange(option.value);
                      setTimeout(() => setOpen(false), 0); // ensure parent state updates before closing
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </div>
                ))}

                {/* Load More Indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground ml-2 text-xs">
                      Loading more...
                    </span>
                  </div>
                )}

                {/* Load More Button */}
                {hasMore && !isLoadingMore && (
                  <div className="py-2 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-auto text-xs"
                      onClick={onLoadMore}
                    >
                      Load More
                    </Button>
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
