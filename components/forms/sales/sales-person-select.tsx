"use client";

/**
 * SalesPersonSelect component for Sales forms
 * Dropdown with search and pagination on scroll
 * Uses SalesPerson API: Code, Name
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
  getSalesPersons,
  searchSalesPersons,
  type SalesPerson,
} from "@/lib/api/services/sales-person.service";

interface SalesPersonSelectProps {
  value: string;
  onChange: (value: string, salesPerson?: SalesPerson) => void;
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

export function SalesPersonSelect({
  value,
  onChange,
  placeholder = "Select",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
}: SalesPersonSelectProps) {
  const [items, setItems] = useState<SalesPerson[]>([]);
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
      const result = await getSalesPersons(INITIAL_LOAD_COUNT, 0);
      setItems(result);
      setSkip(result.length);
      setHasMore(result.length >= INITIAL_LOAD_COUNT);
    } catch (error) {
      console.error("Error loading sales persons:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search with debounce
  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < MIN_SEARCH_LENGTH) {
        setSearchQuery(query);
        loadInitialItems();
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
          const result = await searchSalesPersons(
            query,
            PAGE_SIZE,
            0,
          );

          if (controller.signal.aborted) return;

          setItems(result);
          setSkip(result.length);
          setHasMore(result.length >= PAGE_SIZE);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          if (controller.signal.aborted) return;
          console.error("Error searching sales persons:", error);
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

  // Load more items (pagination on scroll)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const newItems = searchQuery.length >= MIN_SEARCH_LENGTH
        ? await searchSalesPersons(searchQuery, PAGE_SIZE, skip)
        : await getSalesPersons(PAGE_SIZE, skip);

      if (newItems.length > 0) {
        setItems((prev) => {
          const existingCodes = new Set(prev.map((item) => item.Code));
          const uniqueNewItems = newItems.filter(
            (item) => !existingCodes.has(item.Code),
          );
          return [...prev, ...uniqueNewItems].sort((a, b) =>
            a.Code.localeCompare(b.Code),
          );
        });
        setSkip((prev) => prev + newItems.length);
        setHasMore(newItems.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more sales persons:", error);
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
  const selectedItem = items.find((item) => item.Code === value);
  const displayValue = selectedItem
    ? `${selectedItem.Code} - ${selectedItem.Name}`
    : value || "";

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
        className="flex w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[calc(100vw-2rem)] max-h-[var(--radix-popover-content-available-height,80vh)] min-h-0 flex-col overflow-hidden p-0"
        align="start"
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
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
                : "No sales persons found"}
            </div>
          ) : (
            <>
              {filteredItems.map((item) => (
                <div
                  key={item.Code}
                  className={cn(
                    "hover:bg-muted/50 relative flex cursor-default items-center rounded-sm px-2 py-2 text-sm outline-none select-none",
                    value === item.Code && "bg-muted",
                  )}
                  onClick={() => {
                    onChange(item.Code, item);
                    setIsOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === item.Code ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground font-medium break-words">
                      {item.Code} - {item.Name}
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
