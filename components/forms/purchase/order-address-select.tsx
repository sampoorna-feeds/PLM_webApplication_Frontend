import { useState, useEffect, useCallback } from "react";
import {
  ChevronsUpDown,
  Check,
  Plus,
  Pencil,
  Search,
  X,
  MapPin,
  Loader2,
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
  getOrderAddresses,
  type OrderAddress,
} from "@/lib/api/services/order-address.service";
import { OrderAddressDialog } from "./order-address-dialog";

interface OrderAddressSelectProps {
  vendorNo: string;
  value: string;
  onChange: (code: string, address?: OrderAddress) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function OrderAddressSelect({
  vendorNo,
  value,
  onChange,
  disabled = false,
  placeholder = "Select address",
  className,
}: OrderAddressSelectProps) {
  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState<OrderAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAddress, setEditAddress] = useState<OrderAddress | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    : disabled && value
      ? "None"
      : value || placeholder;

  const filteredAddresses = addresses.filter((addr) => {
    const search = searchTerm.toLowerCase();
    return (
      addr.Code.toLowerCase().includes(search) ||
      addr.Name.toLowerCase().includes(search) ||
      (addr.Address && addr.Address.toLowerCase().includes(search)) ||
      (addr.City && addr.City.toLowerCase().includes(search))
    );
  });

  const handleSelect = (addr: OrderAddress) => {
    onChange(addr.Code, addr);
    setOpen(false);
  };

  const handleDialogSaved = () => {
    loadAddresses();
    setDialogOpen(false);
    setEditAddress(null);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled || !vendorNo}
          onClick={() => !disabled && vendorNo && setOpen(true)}
          className={cn(
            "h-9 flex-1 justify-between text-sm font-normal shadow-sm",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {value && (
              <MapPin className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {value ? displayText : (disabled ? "None" : placeholder)}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
        </Button>

        <Dialog
          open={open}
          onOpenChange={(val) => {
            if (!disabled) setOpen(val);
            if (!val) setSearchTerm("");
          }}
        >
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
                    Select Order Address
                  </DialogTitle>
                  {!isLoading && addresses.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 rounded-sm px-1.5 text-[10px] font-bold tabular-nums"
                    >
                      {addresses.length}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setEditAddress(null);
                    setDialogOpen(true);
                  }}
                  className="h-8 px-2 text-xs"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Create New
                </Button>
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
                    <th className="w-10 border-b px-3 py-2.5" />
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
                  ) : filteredAddresses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <MapPin className="text-muted-foreground/40 h-8 w-8" />
                          <p className="text-muted-foreground text-sm font-medium">
                            {searchTerm ? `No addresses match "${searchTerm}"` : "No order addresses found"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAddresses.map((addr, idx) => {
                      const isSelected = value === addr.Code;
                      return (
                        <tr
                          key={addr.Code}
                          onClick={() => handleSelect(addr)}
                          className={cn(
                            "group cursor-pointer border-b transition-colors",
                            idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                            "hover:bg-primary/5",
                            isSelected && "bg-primary/5"
                          )}
                        >
                          <td className="w-10 px-3 py-2.5 text-center">
                            {isSelected && <Check className="text-primary mx-auto h-3.5 w-3.5" />}
                          </td>
                          <td className={cn("px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap", isSelected ? "text-primary" : "text-foreground")}>
                            {addr.Code}
                          </td>
                          <td className="px-3 py-2.5 text-sm font-medium text-foreground/90">
                            {addr.Name}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {addr.Address || <span className="opacity-30">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {addr.City || <span className="opacity-30">—</span>}
                          </td>
                          <td className="w-10 px-3 py-2.5 text-center">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditAddress(addr);
                                setOpen(false);
                                setDialogOpen(true);
                              }}
                              title="Edit address"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </td>
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
                Showing <b>{filteredAddresses.length}</b> of <b>{addresses.length}</b> addresses
              </span>
            </div>
          </DialogContent>
        </Dialog>
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
