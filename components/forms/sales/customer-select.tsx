'use client';

/**
 * CustomerSelect component for Sales forms
 * Smart dropdown with search, debounce, and pagination for Customer selection
 * Uses Customer API with fields: No, Name, Responsibility_Center, P_A_N_No, Salesperson_Code
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ChevronDownIcon, CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiGet } from '@/lib/api/client';
import { buildODataQuery } from '@/lib/api/endpoints';
import type { ODataResponse } from '@/lib/api/types';

export interface SalesCustomer {
  No: string;
  Name: string;
  Responsibility_Center?: string;
  P_A_N_No?: string;
  Salesperson_Code?: string;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

interface CustomerSelectProps {
  value: string;
  onChange: (value: string, customer?: SalesCustomer) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
}

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;
const INITIAL_LOAD_COUNT = 10;
const PAGE_SIZE = 30;

// Cache for search results
const searchCache = new Map<string, SalesCustomer[]>();

/**
 * Builds the base filter for Customers
 */
function getBaseFilter(): string {
  return `Responsibility_Center in ('','FEED','CATTLE','SWINE') and Blocked eq ' '`;
}

/**
 * Helper to escape single quotes in OData filter values
 */
function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Get initial customers (no search)
 */
async function getCustomers(): Promise<SalesCustomer[]> {
  const query = buildODataQuery({
    $select: 'No,Name,Responsibility_Center,P_A_N_No,Salesperson_Code',
    $filter: getBaseFilter(),
    $orderby: 'No',
    $top: INITIAL_LOAD_COUNT,
  });

  const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<SalesCustomer>>(endpoint);
  return response.value;
}

/**
 * Search customers with query string
 * Makes 2 separate API calls (one for No, one for Name) and combines unique results
 */
async function searchCustomers(query: string): Promise<SalesCustomer[]> {
  if (query.length < MIN_SEARCH_LENGTH) {
    return [];
  }

  // Check cache first
  const cacheKey = `search_${query.toLowerCase()}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const baseFilter = getBaseFilter();
  const escapedQuery = escapeODataValue(query);

  // Make 2 parallel API calls: one for No, one for Name
  const [resultsByNo, resultsByName] = await Promise.all([
    // Search by No field
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name,Responsibility_Center,P_A_N_No,Salesperson_Code',
        $filter: filterByNo,
        $orderby: 'No',
        $top: PAGE_SIZE,
      });
      const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<SalesCustomer>>(endpoint);
      return response.value;
    })(),
    // Search by Name field
    (async () => {
      const filterByName = `(${baseFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name,Responsibility_Center,P_A_N_No,Salesperson_Code',
        $filter: filterByName,
        $orderby: 'No',
        $top: PAGE_SIZE,
      });
      const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<SalesCustomer>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, SalesCustomer>();
  combined.forEach((customer) => {
    if (!uniqueMap.has(customer.No)) {
      uniqueMap.set(customer.No, customer);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No)
  );

  // Cache results
  searchCache.set(cacheKey, uniqueResults);

  return uniqueResults;
}

/**
 * Get paginated customers
 */
async function getCustomersPage(
  skip: number,
  search?: string
): Promise<SalesCustomer[]> {
  const baseFilter = getBaseFilter();

  if (!search || search.length < MIN_SEARCH_LENGTH) {
    // No search - return paginated results
    const query = buildODataQuery({
      $select: 'No,Name,Responsibility_Center,P_A_N_No,Salesperson_Code',
      $filter: baseFilter,
      $orderby: 'No',
      $top: PAGE_SIZE,
      $skip: skip,
    });
    const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<SalesCustomer>>(endpoint);
    return response.value;
  }

  // With search - use dual-call approach
  const escapedQuery = escapeODataValue(search);

  // Make 2 parallel API calls: one for No, one for Name
  const [resultsByNo, resultsByName] = await Promise.all([
    // Search by No field
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name,Responsibility_Center,P_A_N_No,Salesperson_Code',
        $filter: filterByNo,
        $orderby: 'No',
        $top: PAGE_SIZE,
        $skip: skip,
      });
      const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<SalesCustomer>>(endpoint);
      return response.value;
    })(),
    // Search by Name field
    (async () => {
      const filterByName = `(${baseFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name,Responsibility_Center,P_A_N_No,Salesperson_Code',
        $filter: filterByName,
        $orderby: 'No',
        $top: PAGE_SIZE,
        $skip: skip,
      });
      const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<SalesCustomer>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, SalesCustomer>();
  combined.forEach((customer) => {
    if (!uniqueMap.has(customer.No)) {
      uniqueMap.set(customer.No, customer);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No)
  );

  return uniqueResults;
}

export function CustomerSelect({
  value,
  onChange,
  placeholder = 'Select customer',
  disabled = false,
  className,
  hasError = false,
  errorClass = '',
}: CustomerSelectProps) {
  const [items, setItems] = useState<SalesCustomer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial items when dropdown opens
  const loadInitialItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getCustomers();
      setItems(result);
      setSkip(result.length);
      setHasMore(result.length >= INITIAL_LOAD_COUNT);
    } catch (error) {
      console.error('Error loading customers:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search with debounce and request cancellation
  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < MIN_SEARCH_LENGTH) {
        setSearchQuery(query);
        loadInitialItems();
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

      // Debounce the search
      debounceTimerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
          const result = await searchCustomers(query);

          // Check if request was aborted
          if (controller.signal.aborted) {
            return;
          }

          setItems(result);
          setSkip(result.length);
          setHasMore(result.length >= PAGE_SIZE);
        } catch (error) {
          // Ignore abort errors
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          // Check if request was aborted
          if (controller.signal.aborted) {
            return;
          }
          console.error('Error searching customers:', error);
          setItems([]);
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [loadInitialItems]
  );

  // Load more items (pagination)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const newItems = await getCustomersPage(skip, searchQuery || undefined);
      if (newItems.length > 0) {
        setItems((prev) => {
          // Deduplicate by No
          const existingNos = new Set(prev.map((item) => item.No));
          const uniqueNewItems = newItems.filter((item) => !existingNos.has(item.No));
          return [...prev, ...uniqueNewItems].sort((a, b) => a.No.localeCompare(b.No));
        });
        setSkip((prev) => prev + newItems.length);
        setHasMore(newItems.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more customers:', error);
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
      setSearchQuery('');
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
    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [isOpen, hasMore, isLoading, loadMore]);

  // Find selected item display value
  const selectedItem = items.find((item) => item.No === value);
  const displayValue = selectedItem
    ? `${selectedItem.No} - ${selectedItem.Name}`
    : value || '';

  // Filter items based on search query (client-side filtering for display)
  const filteredItems = searchQuery.length >= MIN_SEARCH_LENGTH
    ? items.filter((item) => {
        const codeMatch = item.No?.toLowerCase().includes(searchQuery.toLowerCase());
        const nameMatch = item.Name?.toLowerCase().includes(searchQuery.toLowerCase());
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
            'h-9 text-sm w-full justify-between font-normal shadow-sm',
            !value && 'text-muted-foreground',
            className,
            errorClass
          )}
          data-field-error={hasError}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 min-w-[280px] max-w-[500px] w-auto"
        align="start"
      >
        <div className="p-2 border-b">
          <Input
            placeholder="Search by Code or Name..."
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
          className="max-h-[300px] overflow-y-auto overflow-x-hidden"
        >
          {isLoading && items.length === 0 ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery.length < MIN_SEARCH_LENGTH
                ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
                : 'No customers found'}
            </div>
          ) : (
            <>
              {filteredItems.map((item) => (
                <div
                  key={item.No}
                  className={cn(
                    'relative flex cursor-default select-none items-start rounded-sm px-2 py-2 text-sm outline-none hover:bg-muted/50',
                    value === item.No && 'bg-muted'
                  )}
                  onClick={() => {
                    onChange(item.No, item);
                    setIsOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4 mt-0.5 shrink-0',
                      value === item.No ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">
                      {item.No} - {item.Name}
                    </div>
                    {(item.Responsibility_Center || item.Salesperson_Code) && (
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {item.Responsibility_Center && `RC: ${item.Responsibility_Center}`}
                        {item.Responsibility_Center && item.Salesperson_Code && ' • '}
                        {item.Salesperson_Code && `SP: ${item.Salesperson_Code}`}
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
      </PopoverContent>
    </Popover>
  );
}
