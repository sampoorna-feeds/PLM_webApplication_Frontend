/**
 * Sales Order Form - Multi-Step Wizard
 * Step 1: Order Information
 * Step 2: Line Items
 * Step 3: Order Summary & Submission
 *
 * SalesOrderFormContent: Shared form logic for both FormStack tab and full-page modes.
 * SalesOrderForm: FormStack tab wrapper (for form registry).
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { CustomerSelect, type SalesCustomer } from "./customer-select";
import { ShipToSelect } from "./shipto-select";
import { SalesPersonSelect } from "./sales-person-select";
import type { ShipToAddress } from "@/lib/api/services/shipto.service";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { getAuthCredentials } from "@/lib/auth/storage";
import type { LineItem } from "./line-item-form";
import { LineItemsTable } from "./line-items-table";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClearableField } from "@/components/ui/clearable-field";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import {
  createSalesOrder,
  addSalesOrderLineItems,
  type SalesOrderData,
  type SalesOrderLineItem,
} from "@/lib/api/services/sales-order.service";

export interface SalesOrderFormContentProps {
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
  /** Tab ID for ShipToSelect (form stack context) */
  tabId: string;
  /** Initial form data (for restore from line-item tab or page load) */
  initialFormData?: Record<string, any>;
  /** Optional: persist form data (e.g. to FormStack tab). Omit for standalone page. */
  persistFormData?: (data: Record<string, any>) => void;
}

type Step = 1 | 2 | 3;

export function SalesOrderFormContent({
  onSuccess,
  openLineItemTab,
  tabId,
  initialFormData = {},
  persistFormData,
}: SalesOrderFormContentProps) {

  const [formData, setFormData] = useState({
    customerNo: '',
    customerName: '',
    shipToCode: '',
    shipToName: '',
    salesPersonCode: '',
    salesPersonName: '',
    locationCode: '',
    postingDate: '',
    documentDate: '',
    orderDate: '',
    externalDocumentNo: '',
    customerPriceGroup: '',
    status: '',
    invoiceType: 'Bill of supply',
    lob: '',
    branch: '',
    loc: '',
    ...initialFormData,
  });

  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    Array.isArray(initialFormData?.lineItems) ? initialFormData.lineItems : []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(
    (typeof initialFormData?.currentStep === "number" &&
    initialFormData.currentStep >= 1 &&
    initialFormData.currentStep <= 3
      ? initialFormData.currentStep
      : 1) as Step
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
      if (typeof initialFormData.currentStep === 'number' && initialFormData.currentStep >= 1 && initialFormData.currentStep <= 3) {
        setCurrentStep(initialFormData.currentStep as Step);
      }
    }
  }, [initialFormData]);

  // Sync Location Code with LOC value
  useEffect(() => {
    setFormData((prev) => {
      // If LOC is set, sync locationCode to match
      // If LOC is cleared, clear locationCode too
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
    // Don't call updateFormData here - it causes re-renders and focus loss
    // We'll sync on step changes instead
  };

  // Customer change handler
  const handleCustomerChange = (
    customerNo: string,
    customer?: SalesCustomer,
  ) => {
    const nextSalesPersonCode =
      customer?.Salesperson_Code || formData.salesPersonCode;
    const nextSalesPersonName =
      nextSalesPersonCode === formData.salesPersonCode
        ? formData.salesPersonName
        : "";

    const newData = {
      ...formData,
      customerNo,
      customerName: customer?.Name || "",
      salesPersonCode: nextSalesPersonCode,
      salesPersonName: nextSalesPersonName,
      customerPriceGroup: customer?.Customer_Price_Group || '',
      shipToCode: '',
      shipToName: '',
      locationCode: '',
    };
    setFormData(newData);
    // Don't call updateFormData - it causes re-renders
  };

  // ShipTo change handler
  const handleShipToChange = (shipToCode: string, shipTo?: ShipToAddress) => {
    const newData = {
      ...formData,
      shipToCode,
      shipToName: shipTo?.Name || "",
      locationCode: shipTo?.Location_Code || formData.locationCode,
    };
    setFormData(newData);
    // Don't call updateFormData - it causes re-renders
  };

  // Step 1 validation - all key fields mandatory except External Document No. and Ship to (optional).
  const isStep1Valid = (): boolean => {
    return !!(
      formData.lob &&
      formData.branch &&
      formData.loc &&
      formData.customerNo &&
      formData.salesPersonCode &&
      (formData.locationCode || formData.loc) &&
      formData.postingDate &&
      formData.documentDate &&
      formData.orderDate &&
      formData.invoiceType
    );
  };

  // Step navigation
  const canGoToStep = (step: Step): boolean => {
    if (step === 1) return true;
    if (step === 2) {
      // Require all mandatory Step 1 fields (except External Document No.)
      return isStep1Valid();
    }
    if (step === 3) {
      // Require customer, at least one line item and essential dates for final submission
      return !!(
        formData.customerNo &&
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
        customerNo: formData.customerNo,
        locationCode: formData.locationCode || formData.loc || '',
        customerPriceGroup: formData.customerPriceGroup || '',
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
        customerNo: formData.customerNo,
        locationCode: formData.locationCode || formData.loc || '',
        customerPriceGroup: formData.customerPriceGroup || '',
      },
      context: {
        openedFromParent: true,
        switchToTabId: tabId,
        onSave: (updatedLineItem: LineItem) => {
          const updated = lineItems.map((item) =>
            item.id === lineItem.id ? updatedLineItem : item
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
      const orderData: SalesOrderData = {
        customerNo: formData.customerNo,
        customerName: formData.customerName,
        shipToCode: formData.shipToCode,
        salesPersonCode: formData.salesPersonCode,
        locationCode: formData.locationCode || formData.loc,
        postingDate: formData.postingDate,
        documentDate: formData.documentDate,
        orderDate: formData.orderDate,
        externalDocumentNo: formData.externalDocumentNo,
        invoiceType: formData.invoiceType,
        lob: formData.lob,
        branch: formData.branch,
        loc: formData.loc,
      };

      const orderResponse = await createSalesOrder(orderData);
      // API returns document number as "No"; we use it for both orderId and orderNo
      const orderId = orderResponse.orderId ?? orderResponse.orderNo;

      if (!orderId) {
        throw new Error("Failed to create order: No order number returned");
      }

      const lineItemsData: SalesOrderLineItem[] = lineItems.map((item) => ({
        type: item.type,
        no: item.no,
        description: item.description,
        uom: item.uom,
        quantity: item.quantity,
        mrp: item.mrp,
        price: item.price,
        unitPrice: item.unitPrice,
        totalMRP: item.totalMRP,
        discount: item.discount,
        amount: item.amount,
        exempted: item.exempted,
        gstGroupCode: item.gstGroupCode,
        hsnSacCode: item.hsnSacCode,
        tcsGroupCode: item.tcsGroupCode,
      }));

      const locationCode = formData.locationCode || formData.loc || "";
      await addSalesOrderLineItems(orderId, lineItemsData, locationCode);
      onSuccess(orderResponse.orderNo || orderId);
    } catch (error) {
      console.error("Error placing order:", error);
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

  // Step 1: Order Information - Top: LOB, Branch, LOC, Invoice Type; then Customer row, Name, dates
  const fieldClass = "min-w-0 space-y-1";
  const labelClass = "text-muted-foreground block text-xs font-medium";
  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Top: LOB | Branch | LOC | Invoice Type */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={fieldClass}>
          <label className={labelClass}>LOB</label>
          <ClearableField value={formData.lob} onClear={() => handleInputChange("lob", "")}>
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
          <ClearableField value={formData.branch} onClear={() => handleInputChange("branch", "")}>
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
          <ClearableField value={formData.loc} onClear={() => handleInputChange("loc", "")}>
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
          <label className={labelClass}>Invoice Type</label>
          <ClearableField
            value={formData.invoiceType}
            onClear={() => handleInputChange("invoiceType", "Bill of supply")}
          >
            <Select
              value={formData.invoiceType}
              onValueChange={(value) => handleInputChange("invoiceType", value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
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
      </div>
      {/* Customer | Location | Sales person | Ship to */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={fieldClass}>
          <label className={labelClass}>Customer</label>
          <ClearableField
            value={formData.customerNo}
            onClear={() => handleCustomerChange("", undefined)}
          >
            <CustomerSelect
              value={formData.customerNo}
              onChange={handleCustomerChange}
              placeholder="Select"
            />
          </ClearableField>
          {formData.customerName && (
            <p className="mt-1 pl-1 text-[10px] font-medium text-green-600">
              {formData.customerName}
            </p>
          )}
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Location</label>
          <Input
            value={formData.locationCode || formData.loc || ""}
            disabled
            className="h-8 bg-muted"
            readOnly
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Sales Person</label>
          <ClearableField
            value={formData.salesPersonCode}
            onClear={() =>
              setFormData((prev) => ({
                ...prev,
                salesPersonCode: "",
                salesPersonName: "",
              }))
            }
          >
            <SalesPersonSelect
              value={formData.salesPersonCode}
              onChange={(value, salesPerson) =>
                setFormData((prev) => ({
                  ...prev,
                  salesPersonCode: value,
                  salesPersonName: salesPerson?.Name || "",
                }))
              }
              placeholder="Select"
            />
          </ClearableField>
          {formData.salesPersonName && (
            <p className="mt-1 pl-1 text-[10px] font-medium text-green-600">
              {formData.salesPersonName}
            </p>
          )}
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Ship to</label>
          <ClearableField
            value={formData.shipToCode}
            onClear={() => handleShipToChange("", undefined)}
          >
            <ShipToSelect
              customerNo={formData.customerNo}
              value={formData.shipToCode}
              onChange={handleShipToChange}
              placeholder="Select (optional)"
              tabId={tabId}
              loc={formData.loc}
            />
          </ClearableField>
          {formData.shipToName && (
            <p className="mt-1 pl-1 text-[10px] font-medium text-green-600">
              {formData.shipToName}
            </p>
          )}
        </div>
      </div>
      {/* Dates */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <label className={labelClass}>Posting Date</label>
          <ClearableField
            value={formData.postingDate}
            onClear={() => handleInputChange("postingDate", "")}
          >
            <Input
              type="date"
              value={formData.postingDate}
              onChange={(e) => handleInputChange("postingDate", e.target.value)}
              className="h-8"
              onFocus={(e) => e.stopPropagation()}
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
              onChange={(e) => handleInputChange("documentDate", e.target.value)}
              className="h-8"
              onFocus={(e) => e.stopPropagation()}
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
            className="h-8 bg-muted"
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>External Doc No.</label>
          <ClearableField
            value={formData.externalDocumentNo}
            onClear={() => handleInputChange("externalDocumentNo", "")}
          >
            <Input
              value={formData.externalDocumentNo}
              onChange={(e) => handleInputChange("externalDocumentNo", e.target.value)}
              placeholder="Optional"
              className="h-8"
              onFocus={(e) => e.stopPropagation()}
            />
          </ClearableField>
        </div>
      </div>
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
                <span className="text-muted-foreground block text-xs">Customer</span>
                <span className="font-medium">
                  {formData.customerName || formData.customerNo}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Order Date</span>
                <span className="font-medium">{formData.orderDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Posting Date</span>
                <span className="font-medium">{formData.postingDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Document Date</span>
                <span className="font-medium">{formData.documentDate}</span>
              </div>
              {formData.shipToCode && (
                <div>
                  <span className="text-muted-foreground block text-xs">Ship To</span>
                  <span className="font-medium">
                    {formData.shipToName || formData.shipToCode}
                  </span>
                </div>
              )}
              {formData.invoiceType && (
                <div>
                  <span className="text-muted-foreground block text-xs">Invoice Type</span>
                  <span className="font-medium">{formData.invoiceType}</span>
                </div>
              )}
            </div>
        </div>

        <div>
          <div className="mb-2 flex justify-end">
            <Button onClick={handleAddLineItem} size="sm" variant="outline" className="h-8">
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
        <div className="flex justify-end rounded-lg border bg-muted/20 px-3 py-2">
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
                    currentStep === step ? "bg-primary-foreground/20" : "bg-muted",
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
      <div className="flex justify-between border-t bg-muted/20 px-4 py-3">
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

/** FormStack tab wrapper - for form registry (Invoice, Return, Credit Memo may still use) */
interface SalesOrderFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function SalesOrderForm({
  tabId,
  formData: initialFormData,
  context,
}: SalesOrderFormProps) {
  const { markAsSaved, closeTab, updateFormData } = useFormStack(tabId);
  const { openTab, switchTab } = useFormStackContext();

  const onSuccess = (orderNo: string) => {
    const onOrderPlaced = (context?.onOrderPlaced as (() => void) | undefined);
    markAsSaved();
    onOrderPlaced?.();
    const detailTabId = openTab("sales-order-detail", {
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
    <SalesOrderFormContent
      onSuccess={onSuccess}
      openLineItemTab={(params) => openTab("line-item", params)}
      tabId={tabId}
      initialFormData={initialFormData}
      persistFormData={updateFormData}
    />
  );
}
