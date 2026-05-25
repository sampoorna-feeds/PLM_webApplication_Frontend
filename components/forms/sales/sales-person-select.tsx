"use client";

/**
 * SalesPersonSelect component for Sales forms
 * Dropdown with search and pagination on scroll
 * Uses SalesPerson API: Code, Name
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
import {
  getSalesPersons,
  searchSalesPersons,
  type SalesPerson,
} from "@/lib/api/services/sales-person.service";

interface SalesPersonSelectProps {
  value: string;
  salesPersonName?: string;
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
  salesPersonName,
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
  const [activeIndex, setActiveIndex] = useState(-1);

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
    async (query: string, currentDisplayVal: string) => {
      const activeQuery = query === currentDisplayVal ? "" : query;
      if (activeQuery.length < MIN_SEARCH_LENGTH) {
        setSearchQuery(query);
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
          const result = await searchSalesPersons(activeQuery, PAGE_SIZE, 0);

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
    [],
  );

  // Find selected item display value
  const displayValue = value || "";

  // Load more items (pagination on scroll)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const activeQuery = searchQuery === displayValue ? "" : searchQuery;
    try {
      const newItems =
        activeQuery.length >= MIN_SEARCH_LENGTH
          ? await searchSalesPersons(activeQuery, PAGE_SIZE, skip)
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
  }, [isLoading, hasMore, skip, searchQuery, displayValue]);

  // Handle dropdown open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setActiveIndex(-1);
      setSearchQuery(displayValue);
    } else {
      setActiveIndex(-1);
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

  const activeQuery = searchQuery === displayValue ? "" : searchQuery;
  const filteredItems =
    activeQuery.length >= MIN_SEARCH_LENGTH
      ? items.filter((item) => {
          const codeMatch = item.Code?.toLowerCase().includes(
            activeQuery.toLowerCase(),
          );
          const nameMatch = item.Name?.toLowerCase().includes(
            activeQuery.toLowerCase(),
          );
          return codeMatch || nameMatch;
        })
      : items;

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen) {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    } else if (e.key === "Enter") {
      if (isOpen) {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredItems.length) {
          const item = filteredItems[activeIndex];
          onChange(item.Code, item);
          setIsOpen(false);
          setSearchQuery("");
        } else {
          setIsOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSearchQuery("");
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

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
              setActiveIndex(-1);
              performSearch(query, displayValue);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={(e) => {
              if (!isOpen) {
                setSearchQuery(displayValue);
                setIsOpen(true);
              }
              e.target.select();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "h-9 w-full pr-10 text-sm font-normal shadow-sm",
              !value && !isOpen && "text-muted-foreground",
              className,
              errorClass
            )}
          />
          <div className="absolute right-0 top-0 flex h-full items-center gap-1.5 px-3">

            {isLoading && items.length === 0 ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            )}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="flex max-h-[var(--radix-popover-content-available-height,80vh)] min-h-0 w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] min-w-[320px] flex-col overflow-hidden p-0"
        align="start"
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                {filteredItems.map((item, idx) => {
                  const isFocused = activeIndex === idx;
                  const isSelected = value === item.Code;
                  return (
                    <div
                      key={item.Code}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "relative flex cursor-default items-center rounded-sm px-2 py-2 text-sm outline-none select-none",
                        isSelected ? "bg-muted" : "hover:bg-muted/50",
                        isFocused && !isSelected && "bg-accent text-accent-foreground",
                      )}
                      onClick={() => {
                        onChange(item.Code, item);
                        setIsOpen(false);
                        setActiveIndex(-1);
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
                );
              })}
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
