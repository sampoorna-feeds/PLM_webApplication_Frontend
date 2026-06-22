"use client";

/**
 * AccountSelect component
 * Smart dropdown with search, debounce, and pagination for Account No. and Bal. Acc No.
 * Supports G/L Account, Vendor, and Customer based on accountType prop
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
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  getGLAccounts,
  searchGLAccounts,
  getGLAccountsPage,
  type GLAccount,
} from "@/lib/api/services/account.service";
import {
  getVendors,
  searchVendors,
  getVendorsPage,
  type Vendor,
} from "@/lib/api/services/vendor.service";
import {
  getCustomers,
  searchCustomers,
  getCustomersPage,
  type Customer,
} from "@/lib/api/services/customer.service";

type AccountType = "G/L Account" | "Vendor" | "Customer";
type AccountItem = GLAccount | Vendor | Customer;

interface AccountSelectProps {
  accountType: AccountType | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
  excludeValue?: string; // Account number to exclude from the list (e.g., Account No. when selecting Bal. Acc No.)
  modal?: boolean;
}

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 3; // Minimum 3 characters before search (per UI rules)
const INITIAL_LOAD_COUNT = 20;
const PAGE_SIZE = 30;

export function AccountSelect({
  accountType,
  value,
  onChange,
  placeholder = "",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
  excludeValue,
  modal = false,
}: AccountSelectProps) {
  const [items, setItems] = useState<AccountItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevAccountTypeRef = useRef<AccountType | undefined>(accountType);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeReasonRef = useRef<"select" | "escape" | "tab" | "clickOutside" | null>(null);

  // Load initial items when dropdown opens
  const loadInitialItems = useCallback(async () => {
    if (!accountType) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      let result: AccountItem[];
      switch (accountType) {
        case "G/L Account":
          result = await getGLAccounts();
          break;
        case "Vendor":
          result = await getVendors();
          break;
        case "Customer":
          result = await getCustomers();
          break;
        default:
          result = [];
      }
      setItems(result);
      setSkip(result.length);
      setHasMore(result.length >= INITIAL_LOAD_COUNT);
    } catch (error) {
      console.error("Error loading accounts:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [accountType]);

  // Search with debounce and request cancellation
  const performSearch = useCallback(
    async (query: string) => {
      if (!accountType) {
        setItems([]);
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

      // If query is empty, reload initial items
      if (query.trim() === "") {
        setSearchQuery("");
        loadInitialItems();
        return;
      }

      // If query is too short (less than 3 chars), don't make any API call
      // Just keep showing the already loaded items (from initial load)
      if (query.length < MIN_SEARCH_LENGTH) {
        // Clear search query but keep existing items
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
          let result: AccountItem[];
          switch (accountType) {
            case "G/L Account":
              result = await searchGLAccounts(query);
              break;
            case "Vendor":
              result = await searchVendors(query);
              break;
            case "Customer":
              result = await searchCustomers(query);
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
          console.error("Error searching accounts:", error);
          setItems([]);
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [accountType],
  );

  // Load more items (pagination)
  const loadMore = useCallback(async () => {
    if (!accountType || isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      let result: AccountItem[];
      switch (accountType) {
        case "G/L Account":
          result = await getGLAccountsPage(skip, searchQuery || undefined);
          break;
        case "Vendor":
          result = await getVendorsPage(skip, searchQuery || undefined);
          break;
        case "Customer":
          result = await getCustomersPage(skip, searchQuery || undefined);
          break;
        default:
          result = [];
      }

      if (result.length > 0) {
        setItems((prev) => {
          // Filter out duplicates by No
          const existingNos = new Set(prev.map((item) => item.No));
          const newItems = result.filter((item) => !existingNos.has(item.No));
          const merged = [...prev, ...newItems];
          // Keep the list alphabetically sorted by Name for Vendor type
          if (accountType === "Vendor") {
            merged.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
          }
          return merged;
        });
        setSkip((prev) => prev + result.length);
        setHasMore(result.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more accounts:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [accountType, isLoading, hasMore, skip, searchQuery]);

  // Handle dropdown open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      closeReasonRef.current = null;
    }
  };

  // Load initial items when dropdown opens
  useEffect(() => {
    if (isOpen) {
      closeReasonRef.current = null;
      setFocusedIndex(-1);
      loadInitialItems();
    } else {
      setSearchQuery("");
      setSkip(0);
      setHasMore(true);
    }
  }, [isOpen, loadInitialItems]);

  // Handle scroll for pagination
  useEffect(() => {
    if (!isOpen || !listRef.current) return;

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
  }, [isOpen, hasMore, isLoading, loadMore]);

  // Reload items when accountType changes
  useEffect(() => {
    // Only reload if accountType actually changed
    if (prevAccountTypeRef.current === accountType) {
      return;
    }

    prevAccountTypeRef.current = accountType;

    if (!accountType) {
      setItems([]);
      setSearchQuery("");
      setSkip(0);
      setHasMore(true);
      // Clear value when account type is cleared
      if (value) {
        onChange("");
      }
      return;
    }

    // Clear items and search state when account type changes
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

    // Load initial items for the new account type (call API directly to avoid closure issues)
    const loadItems = async () => {
      setIsLoading(true);
      try {
        let result: AccountItem[];
        switch (accountType) {
          case "G/L Account":
            result = await getGLAccounts();
            break;
          case "Vendor":
            result = await getVendors();
            break;
          case "Customer":
            result = await getCustomers();
            break;
          default:
            result = [];
        }
        setItems(result);
        setSkip(result.length);
        setHasMore(result.length >= INITIAL_LOAD_COUNT);
      } catch (error) {
        console.error("Error loading accounts:", error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();

    // Don't clear value when account type changes if we're just loading items
    // The value will be validated when items are loaded
  }, [accountType]);

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

  // Find selected item name
  const selectedItem = items.find((item) => item.No === value);
  const displayValue = selectedItem
    ? `${selectedItem.No} - ${selectedItem.Name}`
    : value || "";

  const filteredItems = items.filter(
    (item) => !excludeValue || item.No !== excludeValue,
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || !accountType) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setFocusedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : prev,
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
        closeReasonRef.current = "select";
        const item = filteredItems[focusedIndex];
        if (item) {
          onChange(item.No);
          setIsOpen(false);
          setSearchQuery("");
        }
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
    const codeLengths = items.map((item) => item.No?.length || 0);
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
    <Popover open={isOpen} onOpenChange={handleOpenChange} modal={modal}>
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
            disabled={disabled || !accountType}
            autoComplete="off"
            className={cn(
              "h-9 w-full pr-10 text-sm font-normal shadow-sm",
              !value && !isOpen && "text-muted-foreground",
              className,
              errorClass,
            )}
            data-field-error={hasError}
          />
          <div className="pointer-events-none absolute top-0 right-0 flex h-full items-center px-3">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            )}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="flex max-h-[var(--radix-popover-content-available-height,80vh)] min-h-0 w-auto max-w-[500px] min-w-[280px] flex-col overflow-hidden p-0"
        align="start"
        style={{ width: calculateDropdownWidth() }}
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus from scrolling
          e.preventDefault();
        }}
        onPointerDownOutside={() => {
          closeReasonRef.current = "clickOutside";
        }}
        onCloseAutoFocus={(e) => {
          if (closeReasonRef.current === "tab" || closeReasonRef.current === "clickOutside") {
            e.preventDefault();
            return;
          }
          // Prevent auto-focus from scrolling
          e.preventDefault();
          inputRef.current?.focus();
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
            ) : filteredItems.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                {searchQuery.length < MIN_SEARCH_LENGTH &&
                searchQuery.length > 0
                  ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
                  : "No accounts found"}
              </div>
            ) : (
              <>
                {filteredItems.map((item, index) => (
                  <div
                    key={item.No}
                    className={cn(
                      "relative flex cursor-default items-start rounded-sm px-2 py-2 text-sm outline-none select-none",
                      value === item.No && "bg-muted",
                      focusedIndex === index &&
                        "bg-accent text-accent-foreground",
                    )}
                    onClick={() => {
                      closeReasonRef.current = "select";
                      onChange(item.No);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <CheckIcon
                      className={cn(
                        "mt-0.5 mr-2 h-4 w-4 shrink-0",
                        value === item.No ? "opacity-100" : "opacity-0",
                        focusedIndex === index && "text-accent-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "text-foreground font-medium",
                          focusedIndex === index && "text-accent-foreground",
                        )}
                      >
                        {item.No}
                      </div>
                      <div
                        className={cn(
                          "text-muted-foreground mt-0.5 text-xs break-words",
                          focusedIndex === index && "text-accent-foreground/80",
                        )}
                      >
                        {item.Name}
                      </div>
                      {accountType === "Vendor" &&
                        "P_A_N_No" in item &&
                        item.P_A_N_No && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={cn(
                                "bg-muted/60 text-muted-foreground border-border/40 inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider",
                                focusedIndex === index &&
                                  "bg-accent-foreground/15 text-accent-foreground/90 border-accent-foreground/30",
                              )}
                            >
                              PAN: {item.P_A_N_No}
                            </span>
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
