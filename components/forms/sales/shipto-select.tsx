'use client';

/**
 * ShipToSelect component for Sales forms
 * Dropdown for selecting ship-to addresses based on selected customer
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Loader2, ChevronDownIcon, CheckIcon, Plus, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getShipToAddresses, type ShipToAddress } from '@/lib/api/services/shipto.service';
import { useFormStackContext } from '@/lib/form-stack/form-stack-context';

interface ShipToSelectProps {
  customerNo: string;
  value: string;
  onChange: (value: string, shipTo?: ShipToAddress) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
  tabId?: string; // FormStack tab ID for opening nested forms
  loc?: string; // LOC value from parent form to auto-populate location code
}

export function ShipToSelect({
  customerNo,
  value,
  onChange,
  placeholder = 'Select ship-to address',
  disabled = false,
  className,
  hasError = false,
  errorClass = '',
  tabId,
  loc,
}: ShipToSelectProps) {
  const [items, setItems] = useState<ShipToAddress[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const onChangeRef = useRef(onChange);
  
  // Get FormStack context to access openTab
  // Note: This will throw if not in FormStackProvider, but component should only be used
  // within FormStack when tabId is provided. For standalone use, wrap in error boundary.
  let formStackContext: ReturnType<typeof useFormStackContext> | null = null;
  try {
    formStackContext = useFormStackContext();
  } catch {
    // Not within FormStackProvider - component will work but Add/Edit buttons won't appear
    formStackContext = null;
  }

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Load ship-to addresses when customer changes
  useEffect(() => {
    const loadShipToAddresses = async () => {
      if (!customerNo) {
        setItems([]);
        return;
      }

      setIsLoading(true);
      try {
        const addresses = await getShipToAddresses(customerNo);
        setItems(addresses);
        
        // Check if current value is still valid for this customer (only if value exists)
        // Use a ref to track if we've already cleared to prevent infinite loops
        if (value && addresses.length > 0) {
          const isValid = addresses.some((item) => item.Code === value);
          if (!isValid && value !== '') {
            // Clear invalid selection only if value is not already empty
            onChangeRef.current('', undefined);
          }
        } else if (value && addresses.length === 0 && value !== '') {
          // No addresses found but we have a value - clear it only if not already empty
          onChangeRef.current('', undefined);
        }
      } catch (error) {
        console.error('Error loading ship-to addresses:', error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadShipToAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerNo]);

  // Handle "Add New" button click
  const handleAddNew = useCallback(() => {
    if (!formStackContext || !customerNo) {
      return;
    }
    setIsOpen(false);
    formStackContext.openTab('add-shipto', {
      title: 'Add Ship-To Address',
      formData: { 
        customerNo,
        locationCode: loc || '', // Pass LOC value to auto-populate location code
      },
      context: { openedFromParent: true },
      autoCloseOnSuccess: true,
    });
  }, [formStackContext, customerNo, loc]);

  // Handle "Edit" button click
  const handleEdit = useCallback(
    (shipTo: ShipToAddress, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!formStackContext || !customerNo) {
        return;
      }
      setIsOpen(false);
      formStackContext.openTab('add-shipto', {
        title: 'Edit Ship-To Address',
        formData: {
          customerNo,
          existingShipTo: shipTo,
          code: shipTo.Code,
        },
        context: { openedFromParent: true },
        autoCloseOnSuccess: true,
      });
    },
    [formStackContext, customerNo]
  );

  // Refresh list when a ship-to form tab closes (if form was opened from here)
  // Use a ref to track previous tab count to detect when a tab closes
  const prevTabCountRef = useRef<number>(0);
  const tabsRef = useRef<string>('');
  
  useEffect(() => {
    if (!formStackContext || !tabId || !customerNo) return;

    // Create a stable string representation of relevant tabs to detect changes
    const shipToTabs = formStackContext.tabs
      .filter((tab) => tab.formType === 'add-shipto' && tab.context?.openedFromParent === true)
      .map((tab) => tab.id)
      .sort()
      .join(',');
    
    const currentTabCount = formStackContext.tabs.filter(
      (tab) => tab.formType === 'add-shipto' && tab.context?.openedFromParent === true
    ).length;

    // Only refresh if tabs actually changed (not just on every render)
    if (tabsRef.current !== shipToTabs) {
      tabsRef.current = shipToTabs;
      
      // Only refresh if a tab was closed (count decreased)
      if (prevTabCountRef.current > 0 && currentTabCount < prevTabCountRef.current) {
        // Tab was closed, refresh the list
        getShipToAddresses(customerNo)
          .then((addresses) => {
            setItems(addresses);
          })
          .catch((error) => {
            console.error('Error refreshing ship-to addresses:', error);
          });
      }

      prevTabCountRef.current = currentTabCount;
    }
  }, [formStackContext?.tabs.length, tabId, customerNo, formStackContext]);

  // Find selected item display value
  const selectedItem = items.find((item) => item.Code === value);
  const displayValue = selectedItem
    ? `${selectedItem.Code} - ${selectedItem.Name}`
    : value || '';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled || !customerNo}
          className={cn(
            'h-9 text-sm w-full justify-between font-normal shadow-sm',
            !value && 'text-muted-foreground',
            className,
            errorClass
          )}
          data-field-error={hasError}
        >
          <span className="truncate">
            {!customerNo
              ? 'Select customer first'
              : displayValue || placeholder}
          </span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 min-w-[280px] max-w-[500px] w-auto"
        align="start"
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus from scrolling
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Prevent auto-focus from scrolling
          e.preventDefault();
        }}
      >
        {/* Header with Add New button */}
        {customerNo && formStackContext && (
          <div className="p-2 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Ship-To Addresses</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddNew}
              className="h-7 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add New
            </Button>
          </div>
        )}
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {!customerNo
                ? 'Select a customer first'
                : 'No ship-to addresses found'}
            </div>
          ) : (
            <>
              {items.map((item) => (
                <div
                  key={item.Code}
                  className={cn(
                    'group relative flex cursor-default select-none items-start rounded-sm px-2 py-2 text-sm outline-none hover:bg-muted/50',
                    value === item.Code && 'bg-muted'
                  )}
                >
                  <div
                    className="flex-1 flex items-start"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(item.Code, item);
                      setIsOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        'mr-2 h-4 w-4 mt-0.5 shrink-0',
                        value === item.Code ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">
                        {item.Code} - {item.Name}
                      </div>
                      {item.Location_Code && (
                        <div className="text-muted-foreground text-xs mt-0.5">
                          Location: {item.Location_Code}
                        </div>
                      )}
                    </div>
                  </div>
                  {formStackContext && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleEdit(item, e)}
                      title="Edit ship-to address"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
