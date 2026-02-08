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
    [accountType, loadInitialItems],
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
          return [...prev, ...newItems];
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
      // Always load items when opening, even if we have some, to ensure value is in list
      if (
        items.length === 0 ||
        (value && !items.find((item) => item.No === value))
      ) {
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
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled || !accountType}
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
        className="w-auto max-w-[500px] min-w-[280px] p-0"
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
        <div className="border-b p-2">
          <Input
            placeholder="Search by No or Name..."
            value={searchQuery}
            onChange={(e) => {
              const query = e.target.value;
              setSearchQuery(query);
              performSearch(query);
            }}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div
          ref={listRef}
          className="max-h-[300px] overflow-x-hidden overflow-y-auto"
          onScroll={(e) => {
            const target = e.currentTarget;
            if (
              target.scrollHeight - target.scrollTop <=
                target.clientHeight * 1.5 &&
              hasMore &&
              !isLoading
            ) {
              loadMore();
            }
          }}
        >
          {isLoading && items.length === 0 ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-sm">
              {searchQuery.length < MIN_SEARCH_LENGTH
                ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
                : "No accounts found"}
            </div>
          ) : (
            <>
              {items
                .filter((item) => !excludeValue || item.No !== excludeValue)
                .map((item) => (
                  <div
                    key={item.No}
                    className={cn(
                      "hover:bg-muted/50 relative flex cursor-default items-start rounded-sm px-2 py-2 text-sm outline-none select-none",
                      value === item.No && "bg-muted",
                    )}
                    onClick={() => {
                      onChange(item.No);
                      setIsOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mt-0.5 mr-2 h-4 w-4 shrink-0",
                        value === item.No ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground font-medium">
                        {item.No}
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-xs break-words">
                        {item.Name}
                      </div>
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
      </PopoverContent>
    </Popover>
  );
}
