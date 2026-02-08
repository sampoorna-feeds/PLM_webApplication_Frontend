'use client';

/**
 * Item Selector Form
 * Tab-based interface for selecting items with search, pagination, and filtering
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFormStackContext } from '@/lib/form-stack/form-stack-context';
import {
  getItems,
  searchItems,
  getItemsPage,
  type Item,
} from '@/lib/api/services/item.service';
import {
  getGLAccounts,
  searchGLAccounts,
  getGLAccountsPage,
  type GLPostingAccount,
} from '@/lib/api/services/gl-account.service';

interface ItemSelectorFormProps {
  tabId: string;
  formData?: {
    type?: 'G/L Account' | 'Item';
    filterParams?: Record<string, any>;
  };
  context?: {
    onSelect?: (item: Item | GLPostingAccount, type: 'Item' | 'G/L Account') => void;
    openedFromParent?: boolean;
  };
}

const PAGE_SIZE = 20;

export function ItemSelectorForm({ tabId, formData, context }: ItemSelectorFormProps) {
  const { closeTab } = useFormStackContext();
  const locationCode = formData?.filterParams?.locationCode as string | undefined;
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<(Item | GLPostingAccount)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [selectedType, setSelectedType] = useState<'Item' | 'G/L Account'>(
    formData?.type || 'Item'
  );
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Load initial items (ItemList filtered by location when provided)
  const loadInitialItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result =
        selectedType === 'Item'
          ? await getItems(PAGE_SIZE, locationCode)
          : await getGLAccounts(PAGE_SIZE);

      setItems(result);
      setSkip(result.length);
      setHasMore(result.length >= PAGE_SIZE);
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, locationCode]);

  // Search items
  const performSearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        loadInitialItems();
        return;
      }

      setIsLoading(true);
      try {
        const result =
          selectedType === 'Item'
            ? await searchItems(query, locationCode)
            : await searchGLAccounts(query);

        setItems(result);
        setSkip(result.length);
        setHasMore(result.length >= PAGE_SIZE);
      } catch (error) {
        console.error('Error searching items:', error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedType, loadInitialItems, locationCode]
  );

  // Load more items (pagination)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const newItems =
        selectedType === 'Item'
          ? await getItemsPage(skip, searchQuery || undefined, PAGE_SIZE, locationCode)
          : await getGLAccountsPage(skip, searchQuery || undefined);

      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => [...prev, ...newItems]);
        setSkip((prev) => prev + newItems.length);
        setHasMore(newItems.length >= PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, skip, searchQuery, selectedType, locationCode]);

  // Load items when type changes
  useEffect(() => {
    setItems([]);
    setSkip(0);
    setHasMore(true);
    setSearchQuery('');
    loadInitialItems();
  }, [selectedType, loadInitialItems]);

  // Handle item selection
  const handleSelectItem = useCallback((item: Item | GLPostingAccount) => {
    if (context?.onSelect) {
      context.onSelect(item, selectedType);
    }
    closeTab(tabId);
  }, [context, selectedType, closeTab, tabId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch(searchQuery);
      } else if (searchQuery.length === 0) {
        loadInitialItems();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch, loadInitialItems]);

  // Infinite scroll
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container || !hasMore || isLoading) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      if (isNearBottom && hasMore && !isLoading) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, loadMore]);

  // Get display values (ItemList: No, Description, Unit_Price, Sales_Unit_of_Measure)
  const getItemDisplay = useCallback((item: Item | GLPostingAccount) => {
    if (selectedType === 'Item') {
      const itemData = item as Item;
      return {
        no: itemData.No,
        description: itemData.Description,
        unitPrice: itemData.Unit_Price ?? '',
        salesUom: itemData.Sales_Unit_of_Measure ?? '-',
      };
    } else {
      const accountData = item as GLPostingAccount;
      return {
        no: accountData.No,
        description: accountData.Name,
        unitPrice: '',
        salesUom: '-',
      };
    }
  }, [selectedType]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Select {selectedType}</h2>
          <div className="flex gap-2">
            <Button
              variant={selectedType === 'Item' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('Item')}
            >
              Item
            </Button>
            <Button
              variant={selectedType === 'G/L Account' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('G/L Account')}
            >
              G/L Account
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${selectedType.toLowerCase()} by No. or Description...`}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSkip(0);
              setHasMore(true);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div ref={tableContainerRef} className="flex-1 overflow-y-auto min-h-0">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[120px]">No.</TableHead>
              <TableHead>Description</TableHead>
              {selectedType === 'Item' && (
                <>
                  <TableHead className="w-[100px]">Unit Price</TableHead>
                  <TableHead className="w-[100px]">UOM</TableHead>
                </>
              )}
              <TableHead className="w-[100px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedType === 'Item' ? 5 : 3} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedType === 'Item' ? 5 : 3} className="text-center py-8 text-muted-foreground">
                  {searchQuery.length >= 2 ? 'No items found' : 'Start typing to search...'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {items.map((item) => {
                  const display = getItemDisplay(item);
                  return (
                    <TableRow key={item.No} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{display.no}</TableCell>
                      <TableCell>{display.description}</TableCell>
                      {selectedType === 'Item' && (
                        <>
                          <TableCell className="text-sm">
                            {typeof display.unitPrice === 'number' ? display.unitPrice : display.unitPrice || '-'}
                          </TableCell>
                          <TableCell className="text-sm">{display.salesUom}</TableCell>
                        </>
                      )}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSelectItem(item)}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {hasMore && (
                  <TableRow>
                    <TableCell colSpan={selectedType === 'Item' ? 5 : 3} className="text-center py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMore}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
