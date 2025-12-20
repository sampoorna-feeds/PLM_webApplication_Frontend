'use client';

/**
 * DimensionSelect component
 * Smart dropdown for Branch, LOB, and LOC dimension values
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
import {
  getBranches,
  getBranchesPage,
  getLOBs,
  getLOCs,
  getLOCsPage,
  type DimensionValue,
} from '@/lib/api/services/dimension.service';

type DimensionType = 'BRANCH' | 'LOB' | 'LOC';

interface DimensionSelectProps {
  dimensionType: DimensionType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
}

const DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 3;
const INITIAL_LOAD_COUNT = 20;
const PAGE_SIZE = 30;

export function DimensionSelect({
  dimensionType,
  value,
  onChange,
  placeholder = '',
  disabled = false,
  className,
  hasError = false,
  errorClass = '',
}: DimensionSelectProps) {
  const [items, setItems] = useState<DimensionValue[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevDimensionTypeRef = useRef<DimensionType | undefined>(dimensionType);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if this dimension supports search (LOB doesn't)
  const supportsSearch = dimensionType !== 'LOB';

  // Load initial items when dropdown opens
  const loadInitialItems = useCallback(async () => {
    setIsLoading(true);
    try {
      let result: DimensionValue[];
      switch (dimensionType) {
        case 'BRANCH':
          result = await getBranches();
          break;
        case 'LOB':
          result = await getLOBs();
          break;
        case 'LOC':
          result = await getLOCs();
          break;
        default:
          result = [];
      }
      setItems(result);
      setSkip(result.length);
      setHasMore(result.length >= INITIAL_LOAD_COUNT);
    } catch (error) {
      console.error(`Error loading ${dimensionType}:`, error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [dimensionType]);

  // Search with debounce (only for BRANCH and LOC)
  const performSearch = useCallback(
    async (query: string) => {
      if (!supportsSearch) {
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
      if (query.length < MIN_SEARCH_LENGTH) {
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
          let result: DimensionValue[];
          switch (dimensionType) {
            case 'BRANCH':
              result = await getBranches(query);
              break;
            case 'LOC':
              result = await getLOCs(query);
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
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          // Check if request was aborted
          if (controller.signal.aborted) {
            return;
          }
          console.error(`Error searching ${dimensionType}:`, error);
          setItems([]);
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [dimensionType, supportsSearch]
  );

  // Reload items when dimensionType changes
  useEffect(() => {
    // Only reload if dimensionType actually changed
    if (prevDimensionTypeRef.current === dimensionType) {
      return;
    }

    prevDimensionTypeRef.current = dimensionType;

    // Clear items and search state when dimension type changes
    setItems([]);
    setSearchQuery('');
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

    // Load initial items for the new dimension type
    const loadItems = async () => {
      setIsLoading(true);
      try {
        let result: DimensionValue[];
        switch (dimensionType) {
          case 'BRANCH':
            result = await getBranches();
            break;
          case 'LOB':
            result = await getLOBs();
            break;
          case 'LOC':
            result = await getLOCs();
            break;
          default:
            result = [];
        }
        setItems(result);
        setSkip(result.length);
        setHasMore(result.length >= INITIAL_LOAD_COUNT);
      } catch (error) {
        console.error(`Error loading ${dimensionType}:`, error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();

    // Clear value when dimension type changes
    if (value) {
      onChange('');
    }
  }, [dimensionType, value, onChange]);

  // Load more items (pagination) - only for BRANCH and LOC
  const loadMore = useCallback(async () => {
    if (!supportsSearch || isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      let result: DimensionValue[];
      switch (dimensionType) {
        case 'BRANCH':
          result = await getBranchesPage(skip, searchQuery || undefined);
          break;
        case 'LOC':
          result = await getLOCsPage(skip, searchQuery || undefined);
          break;
        default:
          result = [];
      }

      if (result.length > 0) {
        setItems((prev) => [...prev, ...result]);
        setSkip((prev) => prev + result.length);
        setHasMore(result.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error(`Error loading more ${dimensionType}:`, error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [dimensionType, supportsSearch, isLoading, hasMore, skip, searchQuery]);

  // Handle dropdown open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && items.length === 0) {
      loadInitialItems();
    }
    if (!open) {
      setSearchQuery('');
      setSkip(0);
      setHasMore(true);
    }
  };

  // Handle scroll for pagination
  useEffect(() => {
    if (!isOpen || !listRef.current || !supportsSearch) return;

    const listElement = listRef.current;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = listElement;
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoading) {
        loadMore();
      }
    };

    listElement.addEventListener('scroll', handleScroll);
    return () => listElement.removeEventListener('scroll', handleScroll);
  }, [isOpen, hasMore, isLoading, loadMore, supportsSearch]);

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

  // Find selected item display value
  const selectedItem = items.find((item) => item.Code === value);
  const displayValue = selectedItem
    ? selectedItem.Name
      ? `${selectedItem.Code} - ${selectedItem.Name}`
      : selectedItem.Code
    : value || '';

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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {supportsSearch && (
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
        )}
        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto"
          onScroll={(e) => {
            if (!supportsSearch) return;
            const target = e.currentTarget;
            if (
              target.scrollHeight - target.scrollTop <= target.clientHeight * 1.5 &&
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
            <div className="p-4 text-center text-sm text-muted-foreground">
              {supportsSearch && searchQuery.length < MIN_SEARCH_LENGTH
                ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
                : 'No items found'}
            </div>
          ) : (
            <>
              {items.map((item) => (
                <div
                  key={item.Code}
                  className={cn(
                    'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    value === item.Code && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => {
                    onChange(item.Code);
                    setIsOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.Code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {item.Name ? `${item.Code} - ${item.Name}` : item.Code}
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

