"use client";

import React from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MASTER_DROPDOWN_PAGE_SIZE } from "./purchase-form-options";

export interface PurchaseSearchableSelectOption {
  value: string;
  label: string;
}

interface PurchaseSearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: PurchaseSearchableSelectOption[];
  placeholder?: string;
  loadMore?: (
    skip: number,
    search: string,
  ) => Promise<PurchaseSearchableSelectOption[]>;
  disabled?: boolean;
  className?: string;
  searchInputClassName?: string;
  disabledFallbackLabel?: string;
}

export function PurchaseSearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  loadMore,
  disabled = false,
  className,
  searchInputClassName,
  disabledFallbackLabel = "None",
}: PurchaseSearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [visibleOptions, setVisibleOptions] = React.useState(options);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(Boolean(loadMore));
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (loadMore) {
      setVisibleOptions(options);
      setHasMore(options.length >= MASTER_DROPDOWN_PAGE_SIZE);
      return;
    }
    setVisibleOptions(options);
  }, [options, loadMore]);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const loadMoreOptions = React.useCallback(
    async (skip: number, query: string, replace: boolean = false) => {
      if (!loadMore || isLoadingMore) return;

      setIsLoadingMore(true);
      try {
        const next = await loadMore(skip, query);
        setVisibleOptions((prev) => (replace ? next : [...prev, ...next]));
        setHasMore(next.length >= MASTER_DROPDOWN_PAGE_SIZE);
      } catch (error) {
        console.error("Error loading dropdown options:", error);
        if (replace) setVisibleOptions([]);
        setHasMore(false);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [loadMore, isLoadingMore],
  );

  const handleSearchChange = (nextSearch: string) => {
    setSearch(nextSearch);

    if (!loadMore) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      loadMoreOptions(0, nextSearch, true);
    }, 250);
  };

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!loadMore || !hasMore || isLoadingMore) return;

    const target = e.currentTarget;
    const nearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 50;

    if (nearBottom) {
      loadMoreOptions(visibleOptions.length, search);
    }
  };

  const handleListWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight <= target.clientHeight) return;

    e.preventDefault();
    e.stopPropagation();
    target.scrollTop += e.deltaY;

    if (!loadMore || !hasMore || isLoadingMore) return;

    const nearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 50;

    if (nearBottom) {
      loadMoreOptions(visibleOptions.length, search);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled) return;
    setOpen(nextOpen);

    if (nextOpen && loadMore && visibleOptions.length === 0) {
      loadMoreOptions(0, search, true);
    }
  };

  const filtered = loadMore
    ? visibleOptions
    : search
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase()),
        )
      : options;

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "h-8 w-full justify-between text-sm font-normal",
            !value && "text-muted-foreground",
            className,
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedLabel || (disabled ? disabledFallbackLabel : placeholder)}
          </span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex max-h-(--radix-popover-content-available-height,80vh) min-h-0 w-(--radix-popover-trigger-width) min-w-55 flex-col overflow-hidden p-0"
        align="start"
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b p-2">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn("h-8", searchInputClassName)}
            autoFocus
          />
        </div>
        <div
          className="max-h-60 overflow-y-auto p-1"
          onScroll={handleListScroll}
          onWheel={handleListWheel}
        >
          {filtered.length === 0 && (
            <p className="text-muted-foreground py-2 text-center text-sm">
              No results found.
            </p>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "group relative flex w-full cursor-default items-start rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none",
                value === opt.value
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  : "hover:bg-muted hover:text-foreground",
              )}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                setSearch("");
              }}
            >
              <span
                className="block w-full truncate text-left group-hover:wrap-break-word group-hover:whitespace-normal"
                title={opt.label}
              >
                {opt.label}
              </span>
              {value === opt.value && (
                <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
                  <CheckIcon className="h-4 w-4" />
                </span>
              )}
            </button>
          ))}
          {isLoadingMore && (
            <div className="text-muted-foreground py-2 text-center text-xs">
              Loading more...
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
