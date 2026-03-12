/**
 * Purchase Order Form - Multi-Step Wizard
 * Step 1: Order Information
 * Step 2: Line Items
 * Step 3: Order Summary & Submission
 *
 * PurchaseOrderFormContent: Shared form logic for both FormStack tab and full-page modes.
 * PurchaseOrderForm: FormStack tab wrapper (for form registry).
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
import { SalesPersonSelect } from "@/components/forms/sales/sales-person-select";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { getAuthCredentials } from "@/lib/auth/storage";
import type { LineItem } from "@/components/forms/sales/line-item-form";
import { LineItemsTable } from "@/components/forms/sales/line-items-table";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClearableField } from "@/components/ui/clearable-field";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  createPurchaseOrder,
  addPurchaseOrderLineItems,
  type PurchaseOrderData,
  type PurchaseOrderLineItem,
} from "@/lib/api/services/purchase-order.service";
import { getVendorDetails } from "@/lib/api/services/vendor.service";
import {
  purchaseDropdownsService,
  type TermAndCondition,
  type MandiMaster,
  type PaymentTerm,
} from "@/lib/api/services/purchase-dropdowns.service";

export interface PurchaseOrderFormContentProps {
  /** Called when order is successfully placed */
  onSuccess: (orderNo: string) => void;
  /** Open line-item add/edit tab (from FormStackContext.openTab) */
  openLineItemTab: (params: {
    title: string;
    formData: Record<string, any>;
    context: {
      openedFromParent?: boolean;
      onSave?: (item: LineItem) => void;
      viewOnly?: boolean;
      onEdit?: () => void;
      switchToTabId?: string;
    };
    autoCloseOnSuccess: boolean;
  }) => void;
  /** Tab ID for FormStack context */
  tabId: string;
  /** Initial form data (for restore from line-item tab or page load) */
  initialFormData?: Record<string, any>;
  /** Optional: persist form data (e.g. to FormStack tab). Omit for standalone page. */
  persistFormData?: (data: Record<string, any>) => void;
}

type Step = 1 | 2 | 3;

export function PurchaseOrderFormContent({
  onSuccess,
  openLineItemTab,
  tabId,
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
    dueDateCalculation: "",
    creditorType: "",
    qcType: "",
    dueDate: "",
    ...initialFormData,
  });

  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    Array.isArray(initialFormData?.lineItems) ? initialFormData.lineItems : [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);

  const [termList, setTermList] = useState<TermAndCondition[]>([]);
  const [mandiList, setMandiList] = useState<MandiMaster[]>([]);
  const [paymentTermList, setPaymentTermList] = useState<PaymentTerm[]>([]);

  useEffect(() => {
    purchaseDropdownsService
      .getTermsAndConditions()
      .then(setTermList)
      .catch((err) => console.error("Error fetching terms:", err));
    purchaseDropdownsService
      .getMandiMasters()
      .then(setMandiList)
      .catch((err) => console.error("Error fetching mandis:", err));
    purchaseDropdownsService
      .getPaymentTerms()
      .then(setPaymentTermList)
      .catch((err) => console.error("Error fetching payment terms:", err));
  }, []);
  const [currentStep, setCurrentStep] = useState<Step>(
    (typeof initialFormData?.currentStep === "number" &&
    initialFormData.currentStep >= 1 &&
    initialFormData.currentStep <= 3
      ? initialFormData.currentStep
      : 1) as Step,
  );

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

  // Initialize form data from props (and restore step + line items when returning from line-item tab)
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
      if (
        typeof initialFormData.currentStep === "number" &&
        initialFormData.currentStep >= 1 &&
        initialFormData.currentStep <= 3
      ) {
        setCurrentStep(initialFormData.currentStep as Step);
      }
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

  // Step navigation
  const canGoToStep = (step: Step): boolean => {
    if (step === 1) return true;
    if (step === 2) {
      return isStep1Valid();
    }
    if (step === 3) {
      return !!(
        formData.vendorNo &&
        lineItems.length > 0 &&
        formData.postingDate &&
        formData.documentDate &&
        formData.orderDate
      );
    }
    return false;
  };

  const handleNext = () => {
    const nextStep = (currentStep + 1) as Step;
    if (currentStep < 3 && canGoToStep(nextStep)) {
      setCurrentStep(nextStep);
      persist({ ...formData, currentStep: nextStep, lineItems });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as Step;
      setCurrentStep(prevStep);
      persist({ ...formData, currentStep: prevStep, lineItems });
    }
  };

  const handleStepClick = (step: Step) => {
    if (canGoToStep(step)) {
      setCurrentStep(step);
      persist({ ...formData, currentStep: step, lineItems });
    }
  };

  // Line Items management
  const handleAddLineItem = () => {
    openLineItemTab({
      title: "Add Line Item",
      formData: {
        locationCode: formData.locationCode || formData.loc || "",
      },
      context: {
        openedFromParent: true,
        switchToTabId: tabId,
        onSave: (lineItem: LineItem) => {
          const updated = [...lineItems, lineItem];
          setLineItems(updated);
          persist({ ...formData, lineItems: updated, currentStep: 2 });
        },
      },
      autoCloseOnSuccess: true,
    });
  };

  const handleEditLineItem = (lineItem: LineItem) => {
    openLineItemTab({
      title: "Edit Line Item",
      formData: {
        lineItem,
        locationCode: formData.locationCode || formData.loc || "",
      },
      context: {
        openedFromParent: true,
        switchToTabId: tabId,
        onSave: (updatedLineItem: LineItem) => {
          const updated = lineItems.map((item) =>
            item.id === lineItem.id ? updatedLineItem : item,
          );
          setLineItems(updated);
          persist({ ...formData, lineItems: updated, currentStep: 2 });
        },
      },
      autoCloseOnSuccess: true,
    });
  };

  const handleRemoveLineItem = (lineItemId: string) => {
    const updated = lineItems.filter((item) => item.id !== lineItemId);
    setLineItems(updated);
    persist({ ...formData, lineItems: updated, currentStep });
  };

  const handleUpdateLineItem = (lineItem: LineItem) => {
    const updated = lineItems.map((item) =>
      item.id === lineItem.id ? lineItem : item,
    );
    setLineItems(updated);
    persist({ ...formData, lineItems: updated, currentStep });
  };

  // Final submission
  const handlePlaceOrder = async () => {
    if (!canGoToStep(3)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData: PurchaseOrderData = {
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
        qcType: formData.qcType,
        dueDate: formData.dueDate,
      };

      const orderResponse = await createPurchaseOrder(orderData);
      const orderId = orderResponse.orderId ?? orderResponse.orderNo;

      if (!orderId) {
        throw new Error("Failed to create order: No order number returned");
      }

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
        tdsGroupCode: item.tdsGroupCode,
      }));

      const locationCode = formData.locationCode || formData.loc || "";
      await addPurchaseOrderLineItems(orderId, lineItemsData, locationCode);
      onSuccess(orderResponse.orderNo || orderId);
    } catch (error) {
      console.error("Error placing purchase order:", error);
      const message =
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : error instanceof Error
            ? error.message
            : "Failed to place order. Please try again.";
      setPlaceOrderError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Order Information
  const fieldClass = "min-w-0 space-y-1";
  const labelClass = "text-muted-foreground block text-xs font-medium";
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* 1. Order Details */}
      <section className="space-y-3">
        <h3 className="border-b pb-1 text-sm font-semibold">Order Details</h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={fieldClass}>
            <label className={labelClass}>PO Type</label>
            <Select
              value={formData.poType}
              onValueChange={(value) => handleInputChange("poType", value)}
            >
              <SelectTrigger className="h-8 text-sm">
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
                  <SelectTrigger className="h-8 text-sm">
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
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select / None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bill of supply">Bill of supply</SelectItem>
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
              <SalesPersonSelect
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
              <p className="mt-1 truncate pl-1 text-[10px] font-medium text-green-600">
                {formData.purchasePersonName}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 2. Dimensions */}
      <section className="space-y-3">
        <h3 className="border-b pb-1 text-sm font-semibold">Dimensions</h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
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
              className="bg-muted h-8"
              readOnly
            />
            {/* Show Location Name if we have one. We don't have location name in the form data by default, 
                but we can show loc name if LOC dimension returns it, 
                or we can just show the code for now if name is not fetched */}
            {formData.locationCode && (
              <p className="text-muted-foreground mt-0.5 overflow-hidden pl-1 text-[10px] text-ellipsis whitespace-nowrap">
                {formData.locationCode} Location
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 3. Vendor & Broker */}
      <section className="space-y-3">
        <h3 className="border-b pb-1 text-sm font-semibold">Vendor & Broker</h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <p className="mt-1 truncate pl-1 text-[10px] font-medium text-green-600">
                {formData.vendorName}
              </p>
            )}
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Vendor GST Reg No.</label>
            <Input
              value={formData.vendorGstRegNo}
              disabled
              className="bg-muted h-8"
              placeholder="Auto-filled"
              readOnly
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Vendor PAN No.</label>
            <Input
              value={formData.vendorPanNo}
              disabled
              className="bg-muted h-8"
              placeholder="Auto-filled"
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
                className="h-8"
              />
            </ClearableField>
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
              <p className="mt-1 truncate pl-1 text-[10px] font-medium text-green-600">
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
                type="number"
                step="0.01"
                min="0"
                value={formData.brokerageRate}
                onChange={(e) =>
                  handleInputChange("brokerageRate", e.target.value)
                }
                className="h-8"
                placeholder="0.00"
              />
            </ClearableField>
          </div>
        </div>
      </section>

      {/* 4. Order Address */}
      <section className="space-y-3">
        <h3 className="border-b pb-1 text-sm font-semibold">Order Address</h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            className={`${fieldClass} col-span-1 max-w-md sm:col-span-2 lg:col-span-3`}
          >
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
        </div>
      </section>

      {/* 5. Dates */}
      <section className="space-y-3">
        <h3 className="border-b pb-1 text-sm font-semibold">Dates</h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
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
                className="h-8"
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
                className="h-8"
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
              className="bg-muted h-8"
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
                className="h-8"
              />
            </ClearableField>
          </div>
        </div>
      </section>

      {/* 6. Additional Configurations */}
      <section className="space-y-3">
        <h3 className="border-b pb-1 text-sm font-semibold">
          Additional Configuration
        </h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={fieldClass}>
            <label className={labelClass}>Rate Basis</label>
            <Select
              value={formData.rateBasis}
              onValueChange={(value) => handleInputChange("rateBasis", value)}
            >
              <SelectTrigger className="h-8 text-sm">
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
            <label className={labelClass}>Due Date Calculation</label>
            <Select
              value={formData.dueDateCalculation}
              onValueChange={(value) =>
                handleInputChange("dueDateCalculation", value)
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Posting Date">Posting Date</SelectItem>
                <SelectItem value="Document Date">Document Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Creditor Type</label>
            <Select
              value={formData.creditorType}
              onValueChange={(value) =>
                handleInputChange("creditorType", value)
              }
            >
              <SelectTrigger className="h-8 text-sm">
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
            <label className={labelClass}>QC Type</label>
            <Select
              value={formData.qcType}
              onValueChange={(value) => handleInputChange("qcType", value)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Incoming">Incoming</SelectItem>
                <SelectItem value="Outgoing">Outgoing</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Term Code</label>
            <Combobox
              value={formData.termCode || null}
              onValueChange={(value) => handleInputChange("termCode", value ?? "")}
            >
              <ComboboxInput placeholder="Search term code..." showClear className="h-8 text-sm w-full" />
              <ComboboxContent>
                <ComboboxList>
                  {termList.map((t) => (
                    <ComboboxItem key={t.Terms} value={t.Terms}>
                      {t.Terms} - {t.Conditions}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>No results found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Mandi Name</label>
            <Combobox
              value={formData.mandiName || null}
              onValueChange={(value) => handleInputChange("mandiName", value ?? "")}
            >
              <ComboboxInput placeholder="Search mandi name..." showClear className="h-8 text-sm w-full" />
              <ComboboxContent>
                <ComboboxList>
                  {mandiList.map((m) => (
                    <ComboboxItem key={m.Code} value={m.Code}>
                      {m.Code} - {m.Description}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>No results found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Payment Term Code</label>
            <Combobox
              value={formData.paymentTermCode || null}
              onValueChange={(value) => handleInputChange("paymentTermCode", value ?? "")}
            >
              <ComboboxInput placeholder="Search payment term..." showClear className="h-8 text-sm w-full" />
              <ComboboxContent>
                <ComboboxList>
                  {paymentTermList.map((p) => (
                    <ComboboxItem key={p.Code} value={p.Code}>
                      {p.Code} - {p.Description}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>No results found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </div>
        </div>
      </section>

    </div>
  );

  // Step 2: Line Items
  const renderStep2 = () => (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={handleAddLineItem} size="sm" className="h-8">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Item
        </Button>
      </div>
      <LineItemsTable
        lineItems={lineItems}
        onEdit={handleEditLineItem}
        onRemove={handleRemoveLineItem}
        onUpdate={handleUpdateLineItem}
        editable={true}
        showRowActions
      />
    </div>
  );

  // Step 3: Order Summary
  const renderStep3 = () => {
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <span className="text-muted-foreground block text-xs">
                Vendor
              </span>
              <span className="font-medium">
                {formData.vendorName || formData.vendorNo}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">
                Order Date
              </span>
              <span className="font-medium">{formData.orderDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">
                Posting Date
              </span>
              <span className="font-medium">{formData.postingDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">
                Document Date
              </span>
              <span className="font-medium">{formData.documentDate}</span>
            </div>
            {formData.invoiceType && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Invoice Type
                </span>
                <span className="font-medium">{formData.invoiceType}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex justify-end">
            <Button
              onClick={handleAddLineItem}
              size="sm"
              variant="outline"
              className="h-8"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>
          <LineItemsTable
            lineItems={lineItems}
            onEdit={handleEditLineItem}
            onRemove={handleRemoveLineItem}
            onUpdate={handleUpdateLineItem}
            editable={true}
            showRowActions
          />
        </div>

        {/* Total */}
        <div className="bg-muted/20 flex justify-end rounded-lg border px-3 py-2">
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-sm">Total Amount</span>
            <span className="text-base font-semibold">
              {totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <RequestFailedDialog
        open={!!placeOrderError}
        message={placeOrderError}
        onOpenChange={(open) => !open && setPlaceOrderError(null)}
      />
      <div className="flex h-full flex-col">
        {/* Step Indicators */}
        <div className="border-b px-4 py-3">
          <div className="flex w-full justify-center">
            <div className="flex w-full max-w-2xl items-center gap-1.5">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleStepClick(step as Step);
                    }}
                    disabled={!canGoToStep(step as Step)}
                    className={cn(
                      "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm transition-all",
                      currentStep === step
                        ? "bg-primary text-primary-foreground"
                        : canGoToStep(step as Step)
                          ? "bg-muted/50 hover:bg-muted text-foreground"
                          : "text-muted-foreground cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                        currentStep === step
                          ? "bg-primary-foreground/20"
                          : "bg-muted",
                      )}
                    >
                      {step}
                    </span>
                    <span className="text-sm font-medium">
                      {step === 1 && "Order Info"}
                      {step === 2 && "Line Items"}
                      {step === 3 && "Review"}
                    </span>
                  </button>
                  {step < 3 && (
                    <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Step Navigation */}
        <div className="bg-muted/20 flex justify-between border-t px-4 py-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canGoToStep((currentStep + 1) as Step)}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || !canGoToStep(3)}
            >
              {isSubmitting ? "Placing Order..." : "Place Order"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

/** FormStack tab wrapper - for form registry */
interface PurchaseOrderFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function PurchaseOrderForm({
  tabId,
  formData: initialFormData,
  context,
}: PurchaseOrderFormProps) {
  const { markAsSaved, closeTab, updateFormData } = useFormStack(tabId);
  const { openTab, switchTab } = useFormStackContext();

  const onSuccess = (orderNo: string) => {
    const onOrderPlaced = context?.onOrderPlaced as (() => void) | undefined;
    markAsSaved();
    onOrderPlaced?.();
    const detailTabId = openTab("purchase-order-detail", {
      title: `Order ${orderNo}`,
      context: { orderNo, refetch: onOrderPlaced },
      autoCloseOnSuccess: false,
    });
    // Ensure the new detail tab stays active, then close current tab.
    setTimeout(() => {
      switchTab(detailTabId);
      closeTab();
    }, 0);
  };

  return (
    <PurchaseOrderFormContent
      onSuccess={onSuccess}
      openLineItemTab={(params) => openTab("line-item", params)}
      tabId={tabId}
      initialFormData={initialFormData}
      persistFormData={updateFormData}
    />
  );
}
