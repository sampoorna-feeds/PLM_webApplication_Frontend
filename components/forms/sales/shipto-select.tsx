"use client";

/**
 * ShipToSelect component for Sales forms
 * Dropdown for selecting ship-to addresses based on selected customer
 */

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Loader2,
  ChevronDownIcon,
  CheckIcon,
  Plus,
  Pencil,
  Search,
  X,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getShipToAddresses,
  type ShipToAddress,
} from "@/lib/api/services/shipto.service";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";

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
  placeholder = "Select ship-to address",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
  tabId,
  loc,
}: ShipToSelectProps) {
  const [items, setItems] = useState<ShipToAddress[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
          if (!isValid && value !== "") {
            // Clear invalid selection only if value is not already empty
            onChangeRef.current("", undefined);
          }
        } else if (value && addresses.length === 0 && value !== "") {
          // No addresses found but we have a value - clear it only if not already empty
          onChangeRef.current("", undefined);
        }
      } catch (error) {
        console.error("Error loading ship-to addresses:", error);
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
    formStackContext.openTab("add-shipto", {
      title: "Add Ship-To Address",
      formData: {
        customerNo,
        locationCode: loc || "", // Pass LOC value to auto-populate location code
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
      formStackContext.openTab("add-shipto", {
        title: "Edit Ship-To Address",
        formData: {
          customerNo,
          existingShipTo: shipTo,
          code: shipTo.Code,
        },
        context: { openedFromParent: true },
        autoCloseOnSuccess: true,
      });
    },
    [formStackContext, customerNo],
  );

  // Refresh list when a ship-to form tab closes (if form was opened from here)
  // Use a ref to track previous tab count to detect when a tab closes
  const prevTabCountRef = useRef<number>(0);
  const tabsRef = useRef<string>("");

  useEffect(() => {
    if (!formStackContext || !tabId || !customerNo) return;

    // Create a stable string representation of relevant tabs to detect changes
    const shipToTabs = formStackContext.tabs
      .filter(
        (tab) =>
          tab.formType === "add-shipto" &&
          tab.context?.openedFromParent === true,
      )
      .map((tab) => tab.id)
      .sort()
      .join(",");

    const currentTabCount = formStackContext.tabs.filter(
      (tab) =>
        tab.formType === "add-shipto" && tab.context?.openedFromParent === true,
    ).length;

    // Only refresh if tabs actually changed (not just on every render)
    if (tabsRef.current !== shipToTabs) {
      tabsRef.current = shipToTabs;

      // Only refresh if a tab was closed (count decreased)
      if (
        prevTabCountRef.current > 0 &&
        currentTabCount < prevTabCountRef.current
      ) {
        // Tab was closed, refresh the list
        getShipToAddresses(customerNo)
          .then((addresses) => {
            setItems(addresses);
          })
          .catch((error) => {
            console.error("Error refreshing ship-to addresses:", error);
          });
      }

      prevTabCountRef.current = currentTabCount;
    }
  }, [formStackContext?.tabs.length, tabId, customerNo, formStackContext]);

  // Find selected item display value
  const selectedItem = items.find((item) => item.Code === value);
  const displayValue = selectedItem
    ? `${selectedItem.Code} - ${selectedItem.Name}`
    : value || "";

  // Filter items based on search term
  const filteredItems = items.filter((item) => {
    const search = searchTerm.toLowerCase();
    return (
      item.Code.toLowerCase().includes(search) ||
      item.Name.toLowerCase().includes(search) ||
      (item.Address && item.Address.toLowerCase().includes(search)) ||
      (item.City && item.City.toLowerCase().includes(search))
    );
  });

  const handleSelect = (item: ShipToAddress) => {
    onChange(item.Code, item);
    setIsOpen(false);
  };

   return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        disabled={disabled || !customerNo}
        onClick={() => !disabled && customerNo && setIsOpen(true)}
        className={cn(
          "h-9 w-full justify-between text-sm font-normal shadow-sm",
          !value && "text-muted-foreground",
          className,
          errorClass,
        )}
        data-field-error={hasError}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {value && (
            <MapPin className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">
            {!customerNo
              ? "Select customer first"
              : displayValue || placeholder}
          </span>
        </span>
        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-40" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="flex h-[80vh] flex-col gap-0 p-0"
          style={{ width: "min(1000px, 92vw)", maxWidth: "none" }}
        >
          {/* Header */}
          <DialogHeader className="shrink-0 border-b px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="text-muted-foreground h-4 w-4" />
                <DialogTitle className="text-[15px] font-semibold">
                  Select Ship-To Address
                </DialogTitle>
                {!isLoading && items.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 rounded-sm px-1.5 text-[10px] font-bold tabular-nums"
                  >
                    {items.length}
                  </Badge>
                )}
              </div>
              {formStackContext && customerNo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddNew}
                  className="h-8 px-2 text-xs"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add New
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Search Bar */}
          <div className="bg-muted/30 shrink-0 border-b px-5 py-2.5">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search by Code, Name, Address or City…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-border/60 bg-background h-9 rounded-md pr-9 pl-9 text-sm shadow-none focus-visible:ring-1"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Table Content */}
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="w-10 border-b px-3 py-2.5" />
                  <th className="border-b px-3 py-2.5 text-left font-medium text-muted-foreground">Code</th>
                  <th className="border-b px-3 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                  <th className="border-b px-3 py-2.5 text-left font-medium text-muted-foreground">Address</th>
                  <th className="border-b px-3 py-2.5 text-left font-medium text-muted-foreground">City</th>
                  {formStackContext && <th className="w-10 border-b px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                        <p className="text-muted-foreground text-xs">Loading addresses…</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <MapPin className="text-muted-foreground/40 h-8 w-8" />
                        <p className="text-muted-foreground text-sm font-medium">
                          {searchTerm ? `No addresses match "${searchTerm}"` : "No ship-to addresses found"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isSelected = value === item.Code;
                    return (
                      <tr
                        key={item.Code}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "group cursor-pointer border-b transition-colors",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                          "hover:bg-primary/5",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        <td className="w-10 px-3 py-2.5 text-center">
                          {isSelected && <CheckIcon className="text-primary mx-auto h-3.5 w-3.5" />}
                        </td>
                        <td className={cn("px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap", isSelected ? "text-primary" : "text-foreground")}>
                          {item.Code}
                        </td>
                        <td className="px-3 py-2.5 text-sm font-medium text-foreground/90">
                          {item.Name}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {item.Address || <span className="opacity-30">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {item.City || <span className="opacity-30">—</span>}
                        </td>
                        {formStackContext && (
                          <td className="w-10 px-3 py-2.5 text-center">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e) => handleEdit(item, e)}
                              title="Edit ship-to address"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Status Bar */}
          <div className="bg-muted/20 flex shrink-0 items-center justify-between border-t px-5 py-2 text-[11px] text-muted-foreground">
            <span>
              Showing <b>{filteredItems.length}</b> of <b>{items.length}</b> addresses
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
