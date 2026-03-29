/**
 * Purchase Return Order Form
 * Replicated from the purchase order form so return-order-specific logic can diverge.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import { VendorSelect, type PurchaseVendor } from "./vendor-select";
import { BrokerSelect } from "./broker-select";
import { OrderAddressSelect } from "./order-address-select";
import { PurchaserSelect } from "./purchaser-select";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { getAuthCredentials } from "@/lib/auth/storage";
import type { LineItem } from "@/components/forms/purchase/purchase-line-item.type";
import { PurchaseLineItemsTable } from "./purchase-line-items-table";
import { Plus, ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClearableField } from "@/components/ui/clearable-field";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import { PurchaseOrderLineDialog } from "./purchase-order-line-dialog";
import { PurchaseCopyDocumentDialog } from "./purchase-copy-document-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  createPurchaseReturnOrder,
  addPurchaseReturnOrderLineItems,
  type PurchaseReturnOrderData as PurchaseOrderData,
  type PurchaseReturnOrderLineItem as PurchaseOrderLineItem,
} from "@/lib/api/services/purchase-return-order.service";
import { getVendorDetails } from "@/lib/api/services/vendor.service";
import {
  purchaseDropdownsService,
  type TermAndCondition,
  type MandiMaster,
  type PaymentTerm,
} from "@/lib/api/services/purchase-dropdowns.service";

const CREDITOR_TYPE_OPTIONS = [
  "SOYA CREDITORS",
  "OTHER GRAIN CREDITORS",
  "MEDICINE CREDITORS",
  "CAPEX CREDITORS",
  "SERVICE CREDITORS",
  "IMPORT CREDITORS",
  "MISCELLANEOUS CREDITORS",
  "Maize Creditors",
  "BAJRA Creditors",
  "Wheat Creditors",
  "Mustard DOC Creditors",
  "D.D.G.S Creditors",
  "DEOILED RICE BRAN Creditors",
  "Birds Creditor",
  "Chicks Creditor",
  "Gen Item",
  "Hatching Egg Outside",
  "Premix",
  "Rice Bran Oil",
  "Rice Bran Polish",
  "Rice Kanni",
  "Lime Stone Power",
  "Gaur Meal",
  "Chicken Waste Meal",
  "P.P Bags",
  "Other",
  "ANIMAL FEED SUPLEMENT",
].map((v) => ({ value: v, label: v }));

const MASTER_DROPDOWN_PAGE_SIZE = 30;

/** Popover-based searchable select (mirrors VendorSelect / BrokerSelect pattern) */
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  loadMore,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  loadMore?: (
    skip: number,
    search: string,
  ) => Promise<{ value: string; label: string }[]>;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [visibleOptions, setVisibleOptions] = React.useState(options);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(Boolean(loadMore));
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (loadMore) {
      setVisibleOptions(options);
      setHasMore(options.length >= MASTER_DROPDOWN_PAGE_SIZE);
      return;
    }
    setVisibleOptions(options);
  }, [options, loadMore]);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const loadMoreOptions = React.useCallback(
    async (skip: number, query: string, replace: boolean = false) => {
      if (!loadMore || isLoadingMore) return;

      setIsLoadingMore(true);
      try {
        const next = await loadMore(skip, query);
        setVisibleOptions((prev) => (replace ? next : [...prev, ...next]));
        setHasMore(next.length >= MASTER_DROPDOWN_PAGE_SIZE);
      } catch (error) {
        console.error("Error loading dropdown options:", error);
        if (replace) setVisibleOptions([]);
        setHasMore(false);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [loadMore, isLoadingMore],
  );

  const handleSearchChange = (nextSearch: string) => {
    setSearch(nextSearch);

    if (!loadMore) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      loadMoreOptions(0, nextSearch, true);
    }, 250);
  };

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!loadMore || !hasMore || isLoadingMore) return;

    const target = e.currentTarget;
    const nearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 50;

    if (nearBottom) {
      loadMoreOptions(visibleOptions.length, search);
    }
  };

  const handleListWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight <= target.clientHeight) return;

    e.preventDefault();
    e.stopPropagation();
    target.scrollTop += e.deltaY;

    if (!loadMore || !hasMore || isLoadingMore) return;

    const nearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 50;

    if (nearBottom) {
      loadMoreOptions(visibleOptions.length, search);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen && loadMore && visibleOptions.length === 0) {
      loadMoreOptions(0, search, true);
    }
  };

  const filtered = loadMore
    ? visibleOptions
    : search
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase()),
        )
      : options;

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "h-8 w-full justify-between text-sm font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex max-h-(--radix-popover-content-available-height,80vh) min-h-0 w-(--radix-popover-trigger-width) min-w-55 flex-col overflow-hidden p-0"
        align="start"
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b p-2">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8"
            autoFocus
          />
        </div>
        <div
          className="max-h-60 overflow-y-auto p-1"
          onScroll={handleListScroll}
          onWheel={handleListWheel}
        >
          {filtered.length === 0 && (
            <p className="text-muted-foreground py-2 text-center text-sm">
              No results found.
            </p>
          )}
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "group relative flex w-full cursor-default items-start rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none",
                value === opt.value
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  : "hover:bg-muted hover:text-foreground",
              )}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                setSearch("");
              }}
            >
              <span
                className="block w-full truncate text-left group-hover:wrap-break-word group-hover:whitespace-normal"
                title={opt.label}
              >
                {opt.label}
              </span>
              {value === opt.value && (
                <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
                  <CheckIcon className="h-4 w-4" />
                </span>
              )}
            </button>
          ))}
          {isLoadingMore && (
            <div className="text-muted-foreground py-2 text-center text-xs">
              Loading more...
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface PurchaseOrderFormContentProps {
  /** Called when order is successfully placed */
  onSuccess: (orderNo: string) => void;
  /** Initial form data (for restore on page load/tab reopen) */
  initialFormData?: Record<string, any>;
  /** Optional: persist form data (e.g. to FormStack tab). Omit for standalone page. */
  persistFormData?: (data: Record<string, any>) => void;
}

export function PurchaseOrderFormContent({
  onSuccess,
  initialFormData = {},
  persistFormData,
}: PurchaseOrderFormContentProps) {
  const [formData, setFormData] = useState({
    vendorNo: "",
    vendorName: "",
    purchasePersonCode: "",
    purchasePersonName: "",
    locationCode: "",
    postingDate: "",
    documentDate: "",
    orderDate: "",
    vendorInvoiceNo: "",
    invoiceType: "",
    lob: "",
    branch: "",
    loc: "",
    // New fields
    poType: "Goods",
    serviceType: "",
    vendorGstRegNo: "",
    vendorPanNo: "",
    brokerNo: "",
    brokerName: "",
    brokerageRate: "",
    orderAddressCode: "",
    rateBasis: "",
    termCode: "",
    mandiName: "",
    paymentTermCode: "",
    dueDateCalculation: "Posting Date",
    creditorType: "",
    qcType: "",
    dueDate: "",
    ...initialFormData,
  });

  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    Array.isArray(initialFormData?.lineItems) ? initialFormData.lineItems : [],
  );
  const [createdOrderNo, setCreatedOrderNo] = useState<string>(
    typeof initialFormData?.createdOrderNo === "string"
      ? initialFormData.createdOrderNo
      : "",
  );
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<LineItem | null>(
    null,
  );
  const [isCreatingHeader, setIsCreatingHeader] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);
  const [isCopyDocOpen, setIsCopyDocOpen] = useState(false);

  const [termList, setTermList] = useState<TermAndCondition[]>([]);
  const [mandiList, setMandiList] = useState<MandiMaster[]>([]);
  const [paymentTermList, setPaymentTermList] = useState<PaymentTerm[]>([]);

  useEffect(() => {
    purchaseDropdownsService
      .getTermsAndConditionsPage(0, "", MASTER_DROPDOWN_PAGE_SIZE)
      .then(setTermList)
      .catch((err) => console.error("Error fetching terms:", err));
    purchaseDropdownsService
      .getMandiMastersPage(0, "", MASTER_DROPDOWN_PAGE_SIZE)
      .then(setMandiList)
      .catch((err) => console.error("Error fetching mandis:", err));
    purchaseDropdownsService
      .getPaymentTermsPage(0, "", MASTER_DROPDOWN_PAGE_SIZE)
      .then(setPaymentTermList)
      .catch((err) => console.error("Error fetching payment terms:", err));
  }, []);

  const persist = (data: Record<string, any>) => {
    if (persistFormData) persistFormData(data);
  };

  // Get logged-in user ID
  useEffect(() => {
    const credentials = getAuthCredentials();
    if (credentials) {
      setUserId(credentials.userID);
    }
  }, []);

  // Set all dates to today on load when form is not filled
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFormData((prev) => {
      const updates: Record<string, string> = {};
      if (!prev.postingDate) updates.postingDate = today;
      if (!prev.documentDate) updates.documentDate = today;
      if (!prev.orderDate) updates.orderDate = today;
      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  // Initialize form data from props and restore persisted header/line state.
  useEffect(() => {
    if (initialFormData && Object.keys(initialFormData).length > 0) {
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev) => {
        const next = { ...prev, ...initialFormData };
        if (!next.postingDate) next.postingDate = today;
        if (!next.documentDate) next.documentDate = today;
        if (!next.orderDate) next.orderDate = today;
        return next;
      });
      if (Array.isArray(initialFormData.lineItems)) {
        setLineItems(initialFormData.lineItems);
      }

      const restoredOrderNo =
        typeof initialFormData.createdOrderNo === "string"
          ? initialFormData.createdOrderNo
          : "";
      setCreatedOrderNo(restoredOrderNo);
    }
  }, [initialFormData]);

  // Sync Location Code with LOC value
  useEffect(() => {
    setFormData((prev) => {
      if (prev.loc !== prev.locationCode) {
        return { ...prev, locationCode: prev.loc || "" };
      }
      return prev;
    });
  }, [formData.loc]);

  // Simple input change handler
  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
  };

  // Vendor change handler — also fetches GST / PAN and resets order address
  const handleVendorChange = async (
    vendorNo: string,
    vendor?: PurchaseVendor,
  ) => {
    const newData = {
      ...formData,
      vendorNo,
      vendorName: vendor?.Name || "",
      locationCode: "",
      vendorGstRegNo: "",
      vendorPanNo: "",
      orderAddressCode: "",
    };
    setFormData(newData);

    // Fetch vendor details (GST, PAN)
    if (vendorNo) {
      const details = await getVendorDetails(vendorNo);
      if (details) {
        setFormData((prev) => ({
          ...prev,
          vendorGstRegNo: details.GST_Registration_No || "",
          vendorPanNo: details.P_A_N_No || "",
        }));
      }
    }
  };

  // Step 1 validation - all key fields mandatory except External Document No. and Vendor Invoice No. (optional). Invoice Type is now optional.
  const isStep1Valid = (): boolean => {
    return !!(
      formData.lob &&
      formData.branch &&
      formData.loc &&
      formData.vendorNo &&
      formData.purchasePersonCode &&
      (formData.locationCode || formData.loc) &&
      formData.postingDate &&
      formData.documentDate &&
      formData.orderDate &&
      formData.poType
    );
  };

  const buildOrderData = (): PurchaseOrderData => ({
    vendorNo: formData.vendorNo,
    vendorName: formData.vendorName,
    purchasePersonCode: formData.purchasePersonCode,
    locationCode: formData.locationCode || formData.loc,
    postingDate: formData.postingDate,
    documentDate: formData.documentDate,
    orderDate: formData.orderDate,
    vendorInvoiceNo: formData.vendorInvoiceNo,
    invoiceType: formData.invoiceType,
    lob: formData.lob,
    branch: formData.branch,
    loc: formData.loc,
    poType: formData.poType,
    serviceType: formData.serviceType,
    vendorGstRegNo: formData.vendorGstRegNo,
    vendorPanNo: formData.vendorPanNo,
    brokerNo: formData.brokerNo,
    brokerName: formData.brokerName,
    brokerageRate: formData.brokerageRate,
    orderAddressCode: formData.orderAddressCode,
    rateBasis: formData.rateBasis,
    termCode: formData.termCode,
    mandiName: formData.mandiName,
    paymentTermCode: formData.paymentTermCode,
    dueDateCalculation: formData.dueDateCalculation,
    creditorType: formData.creditorType,
    qcType: formData.qcType === "_none" ? "" : formData.qcType,
    dueDate: formData.dueDate,
  });

  const handleCreateOrderHeader = async () => {
    if (!isStep1Valid()) {
      return;
    }

    setIsCreatingHeader(true);
    try {
      const orderResponse = await createPurchaseReturnOrder(buildOrderData());
      const orderNo = orderResponse.orderNo || orderResponse.orderId;

      if (!orderNo) {
        throw new Error("Failed to create order: No order number returned");
      }

      setCreatedOrderNo(orderNo);
      persist({
        ...formData,
        lineItems,
        createdOrderNo: orderNo,
      });
    } catch (error) {
      console.error(
        "Error creating purchase order header:",
        JSON.stringify(error, null, 2),
      );
      const errObj = error as Record<string, unknown>;
      const message =
        errObj && typeof errObj.message === "string"
          ? typeof errObj.details === "string"
            ? `${errObj.message}\n${errObj.details}`
            : errObj.message
          : error instanceof Error
            ? error.message
            : "Failed to create purchase order header. Please try again.";
      setPlaceOrderError(message);
    } finally {
      setIsCreatingHeader(false);
    }
  };

  // Line Items management
  const handleAddLineItem = () => {
    if (!createdOrderNo) {
      setPlaceOrderError(
        "Create the purchase order header first, then add line items.",
      );
      return;
    }

    setSelectedLineItem(null);
    setIsLineDialogOpen(true);
  };

  const handleEditLineItem = (lineItem: LineItem) => {
    setSelectedLineItem(lineItem);
    setIsLineDialogOpen(true);
  };

  const handleLineItemSave = (lineItem: LineItem) => {
    const updated = selectedLineItem
      ? lineItems.map((item) =>
          item.id === selectedLineItem.id ? lineItem : item,
        )
      : [...lineItems, lineItem];

    setLineItems(updated);
    setSelectedLineItem(null);
    setIsLineDialogOpen(false);
    persist({
      ...formData,
      lineItems: updated,
      createdOrderNo,
    });
  };

  const handleRemoveLineItem = (lineItemId: string) => {
    const updated = lineItems.filter((item) => item.id !== lineItemId);
    setLineItems(updated);
    persist({ ...formData, lineItems: updated, createdOrderNo });
  };

  const handleUpdateLineItem = (lineItem: LineItem) => {
    const updated = lineItems.map((item) =>
      item.id === lineItem.id ? lineItem : item,
    );
    setLineItems(updated);
    persist({ ...formData, lineItems: updated, createdOrderNo });
  };

  // Final submission (line-item creation after header creation)
  const handlePlaceOrder = async () => {
    if (!createdOrderNo) {
      setPlaceOrderError(
        "Create the purchase order header before submitting line items.",
      );
      return;
    }

    if (lineItems.length === 0) {
      setPlaceOrderError("Add at least one line item before completing order.");
      return;
    }

    setIsSubmitting(true);
    try {
      const lineItemsData: PurchaseOrderLineItem[] = lineItems.map((item) => ({
        type: item.type,
        no: item.no,
        description: item.description,
        uom: item.uom,
        quantity: item.quantity,
        price: item.price,
        unitPrice: item.unitPrice,
        discount: item.discount,
        amount: item.amount,
        exempted: item.exempted,
        gstGroupCode: item.gstGroupCode,
        hsnSacCode: item.hsnSacCode,
        tdsSectionCode: item.tdsSectionCode,
      }));

      const locationCode = formData.locationCode || formData.loc || "";
      await addPurchaseReturnOrderLineItems(
        createdOrderNo,
        lineItemsData,
        locationCode,
      );
      onSuccess(createdOrderNo);
    } catch (error) {
      console.error(
        "Error submitting purchase order lines:",
        JSON.stringify(error, null, 2),
      );
      const errObj = error as Record<string, unknown>;
      const message =
        errObj && typeof errObj.message === "string"
          ? typeof errObj.details === "string"
            ? `${errObj.message}\n${errObj.details}`
            : errObj.message
          : error instanceof Error
            ? error.message
            : "Failed to submit line items. Please try again.";
      setPlaceOrderError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Order Information
  const fieldClass = "min-w-0 space-y-0.5";
  const labelClass = "text-muted-foreground block text-[11px] font-medium";
  const renderStep1 = () => (
    <div className="space-y-3">
      {createdOrderNo && (
        <div className="bg-primary/5 text-primary rounded-md border px-3 py-1.5 text-xs font-medium">
          Purchase order header created: {createdOrderNo}. Continue to Line
          Items.
        </div>
      )}

      <div
        className={cn(
          "space-y-4",
          createdOrderNo && "pointer-events-none opacity-70",
        )}
      >
        {/* 1. Core Order Info */}
        <section className="space-y-2">
          <h3 className="text-foreground/80 border-b pb-1 text-xs font-semibold tracking-wider uppercase">
            1. Core Information
          </h3>
          <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <div className={fieldClass}>
              <label className={labelClass}>PO Type</label>
              <Select
                value={formData.poType}
                onValueChange={(value) => handleInputChange("poType", value)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Goods">Goods</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.poType === "Service" && (
              <div className={fieldClass}>
                <label className={labelClass}>Service Type</label>
                <ClearableField
                  value={formData.serviceType}
                  onClear={() => handleInputChange("serviceType", "")}
                >
                  <Select
                    value={formData.serviceType || ""}
                    onValueChange={(value) =>
                      handleInputChange(
                        "serviceType",
                        value === "none" ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="Logistics">Logistics</SelectItem>
                    </SelectContent>
                  </Select>
                </ClearableField>
              </div>
            )}
            <div className={fieldClass}>
              <label className={labelClass}>Invoice Type</label>
              <ClearableField
                value={formData.invoiceType}
                onClear={() => handleInputChange("invoiceType", "")}
              >
                <Select
                  value={formData.invoiceType || ""}
                  onValueChange={(value) =>
                    handleInputChange("invoiceType", value)
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select / None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bill of supply">
                      Bill of supply
                    </SelectItem>
                    <SelectItem value="Export">Export</SelectItem>
                    <SelectItem value="Supplementary">Supplementary</SelectItem>
                    <SelectItem value="Debit Note">Debit Note</SelectItem>
                    <SelectItem value="Non-GST">Non-GST</SelectItem>
                    <SelectItem value="Taxable">Taxable</SelectItem>
                  </SelectContent>
                </Select>
              </ClearableField>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Purchaser Code</label>
              <ClearableField
                value={formData.purchasePersonCode}
                onClear={() => handleInputChange("purchasePersonCode", "")}
              >
              <PurchaserSelect
                  value={formData.purchasePersonCode || ""}
                  onChange={(val, sp) => {
                    setFormData((prev) => ({
                      ...prev,
                      purchasePersonCode: val,
                      purchasePersonName: sp?.Name || "",
                    }));
                  }}
                  placeholder="Select Purchaser"
                />
              </ClearableField>
              {formData.purchasePersonName && (
                <p className="mt-0.5 truncate pl-1 text-[9px] font-medium text-green-600">
                  {formData.purchasePersonName}
                </p>
              )}
            </div>

            {/* Dimensions */}
            <div className={fieldClass}>
              <label className={labelClass}>LOB</label>
              <ClearableField
                value={formData.lob}
                onClear={() => handleInputChange("lob", "")}
              >
                <CascadingDimensionSelect
                  dimensionType="LOB"
                  value={formData.lob}
                  onChange={(value) => handleInputChange("lob", value)}
                  placeholder="Select LOB"
                  userId={userId}
                  compactWhenSingle
                />
              </ClearableField>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Branch</label>
              <ClearableField
                value={formData.branch}
                onClear={() => handleInputChange("branch", "")}
              >
                <CascadingDimensionSelect
                  dimensionType="BRANCH"
                  value={formData.branch}
                  onChange={(value) => handleInputChange("branch", value)}
                  placeholder="Select Branch"
                  lobValue={formData.lob}
                  userId={userId}
                  compactWhenSingle
                />
              </ClearableField>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>LOC</label>
              <ClearableField
                value={formData.loc}
                onClear={() => handleInputChange("loc", "")}
              >
                <CascadingDimensionSelect
                  dimensionType="LOC"
                  value={formData.loc}
                  onChange={(value) => handleInputChange("loc", value)}
                  placeholder="Select LOC"
                  lobValue={formData.lob}
                  branchValue={formData.branch}
                  userId={userId}
                  compactWhenSingle
                />
              </ClearableField>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Location</label>
              <Input
                value={formData.locationCode || formData.loc || ""}
                disabled
                className="bg-muted h-7 text-xs"
                readOnly
              />
              {formData.locationCode && (
                <p className="text-muted-foreground mt-0.5 overflow-hidden pl-1 text-[9px] text-ellipsis whitespace-nowrap">
                  {formData.locationCode} Location
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 2. Vendor, Broker & Address */}
        <section className="space-y-2">
          <h3 className="text-foreground/80 border-b pb-1 text-xs font-semibold tracking-wider uppercase">
            2. Party Details
          </h3>
          <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <div className={fieldClass}>
              <label className={labelClass}>Vendor</label>
              <ClearableField
                value={formData.vendorNo}
                onClear={() => handleVendorChange("", undefined)}
              >
                <VendorSelect
                  value={formData.vendorNo}
                  onChange={handleVendorChange}
                  placeholder="Select Vendor"
                />
              </ClearableField>
              {formData.vendorName && (
                <p className="mt-0.5 truncate pl-1 text-[9px] font-medium text-green-600">
                  {formData.vendorName}
                </p>
              )}
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Vendor GST No.</label>
              <Input
                value={formData.vendorGstRegNo}
                disabled
                className="bg-muted h-7 text-xs"
                placeholder="Auto"
                readOnly
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Vendor PAN</label>
              <Input
                value={formData.vendorPanNo}
                disabled
                className="bg-muted h-7 text-xs"
                placeholder="Auto"
                readOnly
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Vendor Invoice No.</label>
              <ClearableField
                value={formData.vendorInvoiceNo}
                onClear={() => handleInputChange("vendorInvoiceNo", "")}
              >
                <Input
                  value={formData.vendorInvoiceNo}
                  onChange={(e) =>
                    handleInputChange("vendorInvoiceNo", e.target.value)
                  }
                  placeholder="Optional"
                  className="h-7 text-xs"
                />
              </ClearableField>
            </div>
            <div className={`${fieldClass} sm:col-span-2 lg:col-span-2`}>
              <label className={labelClass}>Order Address Select</label>
              <OrderAddressSelect
                vendorNo={formData.vendorNo}
                value={formData.orderAddressCode}
                onChange={(code, addr) =>
                  setFormData((prev) => ({
                    ...prev,
                    orderAddressCode: code,
                    orderAddressName: addr?.Name || "",
                  }))
                }
                disabled={!formData.vendorNo}
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Brokerage Code</label>
              <ClearableField
                value={formData.brokerNo}
                onClear={() =>
                  setFormData((prev) => ({
                    ...prev,
                    brokerNo: "",
                    brokerName: "",
                  }))
                }
              >
                <BrokerSelect
                  value={formData.brokerNo}
                  onChange={(code, broker) =>
                    setFormData((prev) => ({
                      ...prev,
                      brokerNo: code,
                      brokerName: broker?.Name || "",
                    }))
                  }
                />
              </ClearableField>
              {formData.brokerName && (
                <p className="mt-0.5 truncate pl-1 text-[9px] font-medium text-green-600">
                  {formData.brokerName}
                </p>
              )}
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Brokerage Rate</label>
              <ClearableField
                value={formData.brokerageRate}
                onClear={() => handleInputChange("brokerageRate", "")}
              >
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.brokerageRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      handleInputChange("brokerageRate", val);
                    }
                  }}
                  className="h-7 text-xs"
                  placeholder="0.00"
                />
              </ClearableField>
            </div>
          </div>
        </section>

        {/* 3. Dates & Configurations */}
        <section className="space-y-2">
          <h3 className="text-foreground/80 border-b pb-1 text-xs font-semibold tracking-wider uppercase">
            3. Dates & Settings
          </h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4 lg:grid-cols-6">
            <div className={fieldClass}>
              <label className={labelClass}>Posting Date</label>
              <ClearableField
                value={formData.postingDate}
                onClear={() => handleInputChange("postingDate", "")}
              >
                <Input
                  type="date"
                  value={formData.postingDate}
                  onChange={(e) =>
                    handleInputChange("postingDate", e.target.value)
                  }
                  className="h-7 text-xs"
                />
              </ClearableField>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Document Date</label>
              <ClearableField
                value={formData.documentDate}
                onClear={() => handleInputChange("documentDate", "")}
              >
                <Input
                  type="date"
                  value={formData.documentDate}
                  onChange={(e) =>
                    handleInputChange("documentDate", e.target.value)
                  }
                  className="h-7 text-xs"
                />
              </ClearableField>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Order Date</label>
              <Input
                type="date"
                value={formData.orderDate}
                onChange={(e) => handleInputChange("orderDate", e.target.value)}
                disabled
                className="bg-muted h-7 text-xs"
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Due Date</label>
              <ClearableField
                value={formData.dueDate}
                onClear={() => handleInputChange("dueDate", "")}
              >
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                  className="h-7 text-xs"
                />
              </ClearableField>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Due Date Calc</label>
              <Select
                value={formData.dueDateCalculation}
                onValueChange={(value) =>
                  handleInputChange("dueDateCalculation", value)
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Posting Date">Posting Date</SelectItem>
                  <SelectItem value="Document Date">Document Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Rate Basis</label>
              <Select
                value={formData.rateBasis}
                onValueChange={(value) => handleInputChange("rateBasis", value)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EX">EX</SelectItem>
                  <SelectItem value="FOR">FOR</SelectItem>
                  <SelectItem value="CIF">CIF</SelectItem>
                  <SelectItem value="FOB">FOB</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Creditor Type</label>
              <SearchableSelect
                value={formData.creditorType}
                onChange={(value) => handleInputChange("creditorType", value)}
                options={CREDITOR_TYPE_OPTIONS}
                placeholder="Select creditor"
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>QC Type</label>
              <Select
                value={formData.qcType}
                onValueChange={(value) => handleInputChange("qcType", value)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  <SelectItem value="Ex Passing">Ex Passing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Term Code</label>
              <SearchableSelect
                value={formData.termCode}
                onChange={(value) => handleInputChange("termCode", value)}
                options={termList.map((t) => ({
                  value: t.Terms,
                  label: `${t.Terms} - ${t.Conditions}`,
                }))}
                placeholder="Select term"
                loadMore={async (skip, searchValue) => {
                  const rows =
                    await purchaseDropdownsService.getTermsAndConditionsPage(
                      skip,
                      searchValue,
                      MASTER_DROPDOWN_PAGE_SIZE,
                    );
                  return rows.map((t) => ({
                    value: t.Terms,
                    label: `${t.Terms} - ${t.Conditions}`,
                  }));
                }}
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Payment Term</label>
              <SearchableSelect
                value={formData.paymentTermCode}
                onChange={(value) =>
                  handleInputChange("paymentTermCode", value)
                }
                options={paymentTermList.map((p) => ({
                  value: p.Code,
                  label: `${p.Code} - ${p.Description}`,
                }))}
                placeholder="Select pmt term"
                loadMore={async (skip, searchValue) => {
                  const rows =
                    await purchaseDropdownsService.getPaymentTermsPage(
                      skip,
                      searchValue,
                      MASTER_DROPDOWN_PAGE_SIZE,
                    );
                  return rows.map((p) => ({
                    value: p.Code,
                    label: `${p.Code} - ${p.Description}`,
                  }));
                }}
              />
            </div>
            <div className={fieldClass}>
              <label className={labelClass}>Mandi Name</label>
              <SearchableSelect
                value={formData.mandiName}
                onChange={(value) => handleInputChange("mandiName", value)}
                options={mandiList.map((m) => ({
                  value: m.Code,
                  label: `${m.Code} - ${m.Description}`,
                }))}
                placeholder="Select mandi"
                loadMore={async (skip, searchValue) => {
                  const rows =
                    await purchaseDropdownsService.getMandiMastersPage(
                      skip,
                      searchValue,
                      MASTER_DROPDOWN_PAGE_SIZE,
                    );
                  return rows.map((m) => ({
                    value: m.Code,
                    label: `${m.Code} - ${m.Description}`,
                  }));
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <RequestFailedDialog
        open={!!placeOrderError}
        message={placeOrderError}
        onOpenChange={(open) => !open && setPlaceOrderError(null)}
      />
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {renderStep1()}

          {createdOrderNo && (
            <section className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Line Items</h3>
                  <p className="text-muted-foreground text-xs">
                    Order No: {createdOrderNo}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setIsCopyDocOpen(true)}
                  >
                    Copy Document
                  </Button>
                  <Button onClick={handleAddLineItem} size="sm" className="h-8">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Item
                  </Button>
                </div>
              </div>

              <PurchaseLineItemsTable
                lineItems={lineItems}
                onEdit={handleEditLineItem}
                onRemove={handleRemoveLineItem}
                onRowClick={handleEditLineItem}
                showRowActions
              />

              <div className="bg-muted/20 flex justify-end rounded-lg border px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground text-sm">
                    Total Amount
                  </span>
                  <span className="text-base font-semibold">
                    {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-3">
          <div className="text-muted-foreground text-xs">
            {createdOrderNo
              ? `Order ${createdOrderNo} ready for completion`
              : "Create the header first to enable line items"}
          </div>

          {!createdOrderNo ? (
            <Button
              type="button"
              onClick={handleCreateOrderHeader}
              disabled={!isStep1Valid() || isCreatingHeader}
            >
              {isCreatingHeader ? "Creating Order..." : "Create Purchase Order"}
            </Button>
          ) : (
            <Button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || lineItems.length === 0}
            >
              {isSubmitting ? "Saving Line Items..." : "Complete Order"}
            </Button>
          )}
        </div>
      </div>

      {isLineDialogOpen && (
        <PurchaseOrderLineDialog
          isOpen={isLineDialogOpen}
          onOpenChange={(open) => {
            setIsLineDialogOpen(open);
            if (!open) {
              setSelectedLineItem(null);
            }
          }}
          lineItem={selectedLineItem}
          vendorNo={formData.vendorNo}
          locationCode={formData.locationCode || formData.loc || ""}
          onSave={handleLineItemSave}
        />
      )}

      {createdOrderNo && (
        <PurchaseCopyDocumentDialog
          open={isCopyDocOpen}
          toDocNo={createdOrderNo}
          toDocType="Return Order"
          onOpenChange={setIsCopyDocOpen}
          onSuccess={() => setLineItems([])}
        />
      )}
    </>
  );
}

/** FormStack tab wrapper - for form registry */
interface PurchaseReturnOrderFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function PurchaseReturnOrderForm({
  tabId,
  formData: initialFormData,
  context,
}: PurchaseReturnOrderFormProps) {
  const { markAsSaved, closeTab, updateFormData } = useFormStack(tabId);

  const onSuccess = (_orderNo: string) => {
    const onOrderPlaced = context?.onOrderPlaced as (() => void) | undefined;
    markAsSaved();
    onOrderPlaced?.();
    closeTab();
  };

  return (
    <PurchaseOrderFormContent
      onSuccess={onSuccess}
      initialFormData={initialFormData}
      persistFormData={updateFormData}
    />
  );
}
