"use client";

/**
 * OrderAddressDialog — Create or Edit an order address for a vendor.
 */

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrderAddress,
  updateOrderAddress,
  type OrderAddress,
} from "@/lib/api/services/order-address.service";
import { getStates, type State } from "@/lib/api/services/state.service";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDownIcon, CheckIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorNo: string;
  /** If provided, the dialog is in edit mode */
  address: OrderAddress | null;
  onSaved: () => void;
}

interface FormFields {
  Code: string;
  Name: string;
  Address: string;
  Address_2: string;
  City: string;
  County: string;
  Post_Code: string;
  Country_Region_Code: string;
  State: string;
  Contact: string;
  Phone_No: string;
}

const emptyForm: FormFields = {
  Code: "",
  Name: "",
  Address: "",
  Address_2: "",
  City: "",
  County: "",
  Post_Code: "",
  Country_Region_Code: "",
  State: "",
  Contact: "",
  Phone_No: "",
};

export function OrderAddressDialog({
  open,
  onOpenChange,
  vendorNo,
  address,
  onSaved,
}: OrderAddressDialogProps) {
  const isEdit = !!address;
  const [form, setForm] = useState<FormFields>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  // State selection states
  const [states, setStates] = useState<State[]>([]);
  const [stateSearchQuery, setStateSearchQuery] = useState("");
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [stateActiveIndex, setStateActiveIndex] = useState(-1);
  const activeItemRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef<HTMLInputElement>(null);

  // Load states on mount (only once)
  useEffect(() => {
    let isMounted = true;
    const loadStates = async () => {
      try {
        const statesList = await getStates();
        if (isMounted) {
          setStates(statesList);
        }
      } catch (error) {
        console.error("Error loading states:", error);
      }
    };
    loadStates();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-scroll the active state item into view
  useEffect(() => {
    if (stateActiveIndex >= 0 && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [stateActiveIndex]);

  const handleStateChange = (value: string) => {
    setForm((prev) => ({ ...prev, State: value }));
    setIsStateOpen(false);
    setStateSearchQuery("");
    setStateActiveIndex(-1);
    setTimeout(() => {
      contactRef.current?.focus();
    }, 50);
  };

  const filteredStates =
    stateSearchQuery.length > 0
      ? states.filter((state) => {
          const codeMatch = state.Code?.toLowerCase().includes(
            stateSearchQuery.toLowerCase(),
          );
          const nameMatch = state.Description?.toLowerCase().includes(
            stateSearchQuery.toLowerCase(),
          );
          return codeMatch || nameMatch;
        })
      : states;

  const selectedState = states.find((s) => s.Code === form.State);

  const handleStateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setStateActiveIndex((prev) => Math.min(prev + 1, filteredStates.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setStateActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (stateActiveIndex >= 0 && stateActiveIndex < filteredStates.length) {
        handleStateChange(filteredStates[stateActiveIndex].Code);
      }
    }
  };

  useEffect(() => {
    if (address) {
      setForm({
        Code: address.Code,
        Name: address.Name || "",
        Address: address.Address || "",
        Address_2: address.Address_2 || "",
        City: address.City || "",
        County: address.County || "",
        Post_Code: address.Post_Code || "",
        Country_Region_Code: address.Country_Region_Code || "",
        State: address.State || "",
        Contact: address.Contact || "",
        Phone_No: address.Phone_No || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [address, open]);

  const handleChange = (field: keyof FormFields, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.Code.trim()) {
      toastError(new Error("Code is required"));
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit) {
        const { Code, ...updateData } = form;
        await updateOrderAddress(vendorNo, address!.Code, updateData);
        toast.success("Address updated");
      } else {
        await createOrderAddress({
          Vendor_No: vendorNo,
          Code: form.Code,
          Name: form.Name,
          Address: form.Address,
          Address_2: form.Address_2,
          City: form.City,
          County: form.County,
          Post_Code: form.Post_Code,
          Country_Region_Code: form.Country_Region_Code,
          State: form.State,
          Contact: form.Contact,
          Phone_No: form.Phone_No,
        });
        toast.success("Address created");
      }
      onSaved();
    } catch (error: any) {
      console.error("Error saving order address:", error);
      toastError(error, "Failed to save address");
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass = "space-y-1.5";
  const labelClass = "text-xs font-medium";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Order Address" : "New Order Address"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className={fieldClass}>
            <Label className={labelClass}>Code *</Label>
            <Input
              value={form.Code}
              onChange={(e) => handleChange("Code", e.target.value)}
              disabled={isEdit}
              className="h-8"
              placeholder="Address code"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Name</Label>
            <Input
              value={form.Name}
              onChange={(e) => handleChange("Name", e.target.value)}
              className="h-8"
              placeholder="Name"
            />
          </div>
          <div className="col-span-2">
            <div className={fieldClass}>
              <Label className={labelClass}>Address</Label>
              <Input
                value={form.Address}
                onChange={(e) => handleChange("Address", e.target.value)}
                className="h-8"
                placeholder="Address line 1"
              />
            </div>
          </div>
          <div className="col-span-2">
            <div className={fieldClass}>
              <Label className={labelClass}>Address 2</Label>
              <Input
                value={form.Address_2}
                onChange={(e) => handleChange("Address_2", e.target.value)}
                className="h-8"
                placeholder="Address line 2"
              />
            </div>
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>City</Label>
            <Input
              value={form.City}
              onChange={(e) => handleChange("City", e.target.value)}
              className="h-8"
              placeholder="City"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>County</Label>
            <Input
              value={form.County}
              onChange={(e) => handleChange("County", e.target.value)}
              className="h-8"
              placeholder="County"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Post Code</Label>
            <Input
              value={form.Post_Code}
              onChange={(e) => handleChange("Post_Code", e.target.value)}
              className="h-8"
              placeholder="Post code"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Country/Region</Label>
            <Input
              value={form.Country_Region_Code}
              onChange={(e) =>
                handleChange("Country_Region_Code", e.target.value)
              }
              className="h-8"
              placeholder="Country code"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>State (GST) *</Label>
            <Popover 
              open={isStateOpen} 
              onOpenChange={(open) => {
                setIsStateOpen(open);
                if (!open) {
                  setStateActiveIndex(-1);
                  setStateSearchQuery("");
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-8 w-full justify-between text-xs font-normal shadow-sm bg-background border-input"
                >
                  <span className="truncate">
                    {selectedState ? `${selectedState.Description} (${selectedState.Code})` : "Select state"}
                  </span>
                  <ChevronDownIcon className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto max-w-[300px] min-w-[200px] p-0 z-[100]"
                align="start"
              >
                <div className="border-b p-2">
                  <Input
                    placeholder="Search state..."
                    value={stateSearchQuery}
                    onChange={(e) => {
                      setStateSearchQuery(e.target.value);
                      setStateActiveIndex(-1);
                    }}
                    onKeyDown={handleStateKeyDown}
                    className="h-7 text-xs"
                    autoFocus
                  />
                </div>
                <div className="max-h-[150px] overflow-x-hidden overflow-y-auto">
                  {filteredStates.length === 0 ? (
                    <div className="text-muted-foreground p-3 text-center text-xs">
                      No states found
                    </div>
                  ) : (
                    filteredStates.map((state, idx) => {
                      const isFocused = stateActiveIndex === idx;
                      return (
                        <div
                          key={state.Code}
                          ref={isFocused ? activeItemRef : undefined}
                          onMouseEnter={() => setStateActiveIndex(idx)}
                          onClick={() => handleStateChange(state.Code)}
                          className={cn(
                            "hover:bg-muted/50 relative flex cursor-default items-center rounded-sm px-2 py-1 text-xs outline-none select-none",
                            form.State === state.Code && "bg-muted",
                            isFocused && "bg-accent text-accent-foreground"
                          )}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-1.5 h-3 w-3 shrink-0",
                              form.State === state.Code
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-foreground font-medium">
                              {state.Description}
                            </div>
                            <div className="text-muted-foreground mt-0.5 text-[10px]">
                              {state.Code}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Contact</Label>
            <Input
              ref={contactRef}
              value={form.Contact}
              onChange={(e) => handleChange("Contact", e.target.value)}
              className="h-8"
              placeholder="Contact person"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Phone No</Label>
            <Input
              value={form.Phone_No}
              onChange={(e) => handleChange("Phone_No", e.target.value)}
              className="h-8"
              placeholder="Phone number"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
