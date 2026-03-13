"use client";

/**
 * OrderAddressSelect — dropdown to pick an existing order address for a vendor,
 * with "Create New" and "Edit" actions that open OrderAddressDialog.
 */

import { useState, useEffect, useCallback } from "react";
import { ChevronsUpDown, Check, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getOrderAddresses,
  type OrderAddress,
} from "@/lib/api/services/order-address.service";
import { OrderAddressDialog } from "./order-address-dialog";

interface OrderAddressSelectProps {
  vendorNo: string;
  value: string;
  onChange: (code: string, address?: OrderAddress) => void;
  disabled?: boolean;
}

export function OrderAddressSelect({
  vendorNo,
  value,
  onChange,
  disabled = false,
}: OrderAddressSelectProps) {
  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState<OrderAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAddress, setEditAddress] = useState<OrderAddress | null>(null);

  const loadAddresses = useCallback(async () => {
    if (!vendorNo) {
      setAddresses([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getOrderAddresses(vendorNo);
      setAddresses(data);
    } catch (error) {
      console.error("Error loading order addresses:", error);
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [vendorNo]);

  // Reload when vendor changes
  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const selectedAddress = addresses.find((a) => a.Code === value);
  const displayText = selectedAddress
    ? `${selectedAddress.Code} - ${selectedAddress.Name}`
    : value || "Select address";

  const handleDialogSaved = () => {
    loadAddresses();
    setDialogOpen(false);
    setEditAddress(null);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || !vendorNo}
              className="h-9 flex-1 justify-between font-normal"
            >
              <span className="truncate text-left">
                {value ? displayText : "Select address"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <div className="max-h-[200px] overflow-y-auto">
              {isLoading ? (
                <div className="text-muted-foreground py-4 text-center text-sm">
                  Loading...
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-muted-foreground py-4 text-center text-sm">
                  No addresses found
                </div>
              ) : (
                addresses.map((addr) => (
                  <button
                    key={addr.Code}
                    onClick={() => {
                      onChange(addr.Code, addr);
                      setOpen(false);
                    }}
                    className={`hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      value === addr.Code ? "bg-accent" : ""
                    }`}
                  >
                    <Check
                      className={`h-4 w-4 ${value === addr.Code ? "opacity-100" : "opacity-0"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{addr.Code}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {addr.Name}
                      </span>
                      {addr.City && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          · {addr.City}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1"
                onClick={() => {
                  setOpen(false);
                  setEditAddress(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Address
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {value && selectedAddress && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => {
              setEditAddress(selectedAddress);
              setDialogOpen(true);
            }}
            title="Edit address"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <OrderAddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vendorNo={vendorNo}
        address={editAddress}
        onSaved={handleDialogSaved}
      />
    </>
  );
}
