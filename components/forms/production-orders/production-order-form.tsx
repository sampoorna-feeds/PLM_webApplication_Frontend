/**
 * Production Order Form
 * Form component for creating/editing Production Orders in FormStack
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { getAuthCredentials } from "@/lib/auth/storage";
import {
  getLOBsFromUserSetup,
  getBranchesFromUserSetup,
  getLOCsFromUserSetup,
  type DimensionValue,
} from "@/lib/api/services/dimension.service";
import {
  getItems,
  getFamilies,
  getSalesHeaders,
  getProdOrderBOMs,
  getProdOrderBOMVersions,
  getItemByNo,
  type Item,
  type Family,
  type SalesHeader,
  type ProdOrderBOM,
  type ProdOrderBOMVersion,
} from "@/lib/api/services/production-order-data.service";
import {
  getProductionOrderByNo,
  getProductionOrderLines,
  getProductionOrderComponents,
  type ProductionOrderLine,
  type ProductionOrderComponent,
} from "@/lib/api/services/production-orders.service";
import { ProductionOrderLinesTable } from "./production-order-lines-table";
import { ProductionOrderComponentsTable } from "./production-order-components-table";

type SourceType = "Item" | "Family" | "Sales Header" | "";
type BatchSize = "0.8" | "1.0" | "1.5" | "2.0" | "";

const SOURCE_TYPE_OPTIONS: SourceType[] = ["Item", "Family", "Sales Header"];
const BATCH_SIZE_OPTIONS: BatchSize[] = ["0.8", "1.0", "1.5", "2.0"];

interface ProductionOrderFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function ProductionOrderForm({
  tabId,
  formData: initialFormData,
  context,
}: ProductionOrderFormProps) {
  const { tab, registerRefresh, handleSuccess, updateFormData, updateTab } =
    useFormStack(tabId);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Form mode: 'create' | 'view' | 'edit'
  const [localMode, setLocalMode] = useState(context?.mode || "create");
  const isViewMode = localMode === "view";
  const isEditMode = localMode === "edit";
  const isCreateMode = localMode === "create" || (!isViewMode && !isEditMode);
  const orderNo = context?.orderNo as string | undefined;

  // Form state
  const [formState, setFormState] = useState({
    No: "",
    Description: "",
    Shortcut_Dimension_1_Code: "", // LOB
    Shortcut_Dimension_2_Code: "", // Branch Code
    Shortcut_Dimension_3_Code: "", // LOC Code
    Source_Type: "" as SourceType,
    Source_No: "",
    Quantity: 0,
    Due_Date: "",
    Location_Code: "",
    Hatching_Date: "",
    Prod_Bom_No: "",
    BOM_Version_No: "",
    isProdBomFromItem: false,
    Batch_Size: "" as BatchSize,
    ...initialFormData,
  });

  // Dimension dropdowns state
  const [lobs, setLobs] = useState<DimensionValue[]>([]);
  const [branches, setBranches] = useState<DimensionValue[]>([]);
  const [locs, setLocs] = useState<DimensionValue[]>([]);
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(false);

  // Source No dropdown state
  const [sourceOptions, setSourceOptions] = useState<
    (Item | Family | SalesHeader)[]
  >([]);
  const [isLoadingSource, setIsLoadingSource] = useState(false);

  // BOM dropdown state
  const [bomOptions, setBomOptions] = useState<ProdOrderBOM[]>([]);
  const [bomVersionOptions, setBomVersionOptions] = useState<
    ProdOrderBOMVersion[]
  >([]);
  const [isLoadingBom, setIsLoadingBom] = useState(false);
  const [isLoadingBomVersions, setIsLoadingBomVersions] = useState(false);

  // Order lines and components for view/edit mode
  const [orderLines, setOrderLines] = useState<ProductionOrderLine[]>([]);
  const [orderComponents, setOrderComponents] = useState<
    ProductionOrderComponent[]
  >([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isLoadingComponents, setIsLoadingComponents] = useState(false);

  // Get logged-in user ID
  useEffect(() => {
    const credentials = getAuthCredentials();
    if (credentials) {
      setUserId(credentials.userID);
    }
  }, []);

  // Sync local mode with context
  useEffect(() => {
    if (context?.mode) {
      setLocalMode(context.mode);
    }
  }, [context?.mode]);

  // Load order data for view/edit mode
  useEffect(() => {
    if (!orderNo || localMode === "create") {
      // For create mode, mark initial load as complete immediately
      setIsInitialLoadComplete(true);
      return;
    }

    const loadOrderData = async () => {
      try {
        const order = await getProductionOrderByNo(orderNo);
        if (order) {
          setFormState((prev) => ({
            ...prev,
            No: order.No,
            Description: order.Description || "",
            Shortcut_Dimension_1_Code: order.Shortcut_Dimension_1_Code || "",
            Shortcut_Dimension_2_Code: order.Shortcut_Dimension_2_Code || "",
            Shortcut_Dimension_3_Code: order.Shortcut_Dimension_3_Code || "",
            Source_Type: mapSourceType(order.Source_Type),
            Source_No: order.Source_No || "",
            Quantity: order.Quantity || 0,
            Due_Date: order.Due_Date || "",
            Location_Code: order.Location_Code || "",
            Hatching_Date: order.Hatching_Date || "",
            Prod_Bom_No: order.Prod_Bom_No || "",
            BOM_Version_No: order.BOM_Version_No || "",
            isProdBomFromItem: !!order.Prod_Bom_No,
            Batch_Size: (order.Batch_Size as BatchSize) || "",
          }));
        }

        // Load order lines
        setIsLoadingLines(true);
        const lines = await getProductionOrderLines(orderNo);
        setOrderLines(lines);
        setIsLoadingLines(false);

        // Load order components
        setIsLoadingComponents(true);
        const components = await getProductionOrderComponents(orderNo);
        setOrderComponents(components);
        setIsLoadingComponents(false);

        // Mark initial load as complete after data is loaded
        setIsInitialLoadComplete(true);
      } catch (error) {
        console.error("Error loading order data:", error);
        setIsInitialLoadComplete(true);
      }
    };

    loadOrderData();
  }, [orderNo, localMode]);

  // Map API source type to form source type
  const mapSourceType = (apiType?: string): SourceType => {
    if (!apiType) return "";
    const normalized = apiType.toLowerCase();
    if (normalized === "item" || normalized === "0") return "Item";
    if (normalized === "family" || normalized === "1") return "Family";
    if (
      normalized === "sales header" ||
      normalized === "salesheader" ||
      normalized === "2"
    )
      return "Sales Header";
    return "";
  };

  // Register refresh callback
  useEffect(() => {
    registerRefresh(async () => {
      if (orderNo) {
        // Re-fetch order data
        const order = await getProductionOrderByNo(orderNo);
        if (order) {
          setFormState((prev) => ({
            ...prev,
            No: order.No,
            Description: order.Description || "",
            Shortcut_Dimension_1_Code: order.Shortcut_Dimension_1_Code || "",
            Shortcut_Dimension_2_Code: order.Shortcut_Dimension_2_Code || "",
            Shortcut_Dimension_3_Code: order.Shortcut_Dimension_3_Code || "",
            Source_Type: mapSourceType(order.Source_Type),
            Source_No: order.Source_No || "",
            Quantity: order.Quantity || 0,
            Due_Date: order.Due_Date || "",
            Location_Code: order.Location_Code || "",
            Hatching_Date: order.Hatching_Date || "",
            Prod_Bom_No: order.Prod_Bom_No || "",
            BOM_Version_No: order.BOM_Version_No || "",
          }));
        }

        // Refresh lines and components
        const lines = await getProductionOrderLines(orderNo);
        setOrderLines(lines);
        const components = await getProductionOrderComponents(orderNo);
        setOrderComponents(components);
      }
    });
  }, [registerRefresh, orderNo]);

  // Update tab formData whenever formState changes (only after initial load)
  const prevFormStateRef = React.useRef(formState);
  useEffect(() => {
    // Only update formData after initial load is complete to prevent false 'unsaved changes'
    if (!isInitialLoadComplete) return;

    if (
      JSON.stringify(prevFormStateRef.current) !== JSON.stringify(formState)
    ) {
      prevFormStateRef.current = formState;
      updateFormData(formState);
    }
  }, [formState, updateFormData, isInitialLoadComplete]);

  // Load LOBs on mount (for create and edit modes)
  useEffect(() => {
    if (!userId || isViewMode) return;

    const loadLOBs = async () => {
      setIsLoadingDimensions(true);
      try {
        const lobData = await getLOBsFromUserSetup(userId);
        setLobs(lobData);
      } catch (error) {
        console.error("Error loading LOBs:", error);
      } finally {
        setIsLoadingDimensions(false);
      }
    };

    loadLOBs();
  }, [userId, isViewMode]);

  // Load Branches when LOB changes (for create and edit modes)
  useEffect(() => {
    if (!userId || !formState.Shortcut_Dimension_1_Code || isViewMode) {
      if (!isViewMode) setBranches([]);
      return;
    }

    const loadBranches = async () => {
      try {
        const branchData = await getBranchesFromUserSetup(
          formState.Shortcut_Dimension_1_Code,
          userId,
        );
        setBranches(branchData);
      } catch (error) {
        console.error("Error loading branches:", error);
      }
    };

    loadBranches();
  }, [userId, formState.Shortcut_Dimension_1_Code, isViewMode]);

  // Load LOCs when Branch changes (for create and edit modes)
  useEffect(() => {
    if (
      !userId ||
      !formState.Shortcut_Dimension_1_Code ||
      !formState.Shortcut_Dimension_2_Code ||
      isViewMode
    ) {
      if (!isViewMode) setLocs([]);
      return;
    }

    const loadLOCs = async () => {
      try {
        const locData = await getLOCsFromUserSetup(
          formState.Shortcut_Dimension_1_Code,
          formState.Shortcut_Dimension_2_Code,
          userId,
        );
        setLocs(locData);
      } catch (error) {
        console.error("Error loading LOCs:", error);
      }
    };

    loadLOCs();
  }, [
    userId,
    formState.Shortcut_Dimension_1_Code,
    formState.Shortcut_Dimension_2_Code,
    isViewMode,
  ]);

  // Load Source No options when Source Type changes (for create and edit modes)
  useEffect(() => {
    if (!formState.Source_Type || isViewMode) {
      if (!isViewMode) setSourceOptions([]);
      return;
    }

    const loadSourceOptions = async () => {
      setIsLoadingSource(true);
      try {
        let options: (Item | Family | SalesHeader)[] = [];
        switch (formState.Source_Type) {
          case "Item":
            options = await getItems(
              undefined,
              formState.Shortcut_Dimension_1_Code,
            );
            break;
          case "Family":
            options = await getFamilies();
            break;
          case "Sales Header":
            options = await getSalesHeaders();
            break;
        }
        setSourceOptions(options);
      } catch (error) {
        console.error("Error loading source options:", error);
        setSourceOptions([]);
      } finally {
        setIsLoadingSource(false);
      }
    };

    loadSourceOptions();
  }, [formState.Source_Type, formState.Shortcut_Dimension_1_Code, isViewMode]);

  // Load BOM Versions when Prod BOM No changes
  useEffect(() => {
    if (!formState.Prod_Bom_No || formState.isProdBomFromItem || isViewMode) {
      setBomVersionOptions([]);
      return;
    }

    const loadBomVersions = async () => {
      setIsLoadingBomVersions(true);
      try {
        const versions = await getProdOrderBOMVersions(formState.Prod_Bom_No);
        setBomVersionOptions(versions);
      } catch (error) {
        console.error("Error loading BOM versions:", error);
        setBomVersionOptions([]);
      } finally {
        setIsLoadingBomVersions(false);
      }
    };

    loadBomVersions();
  }, [formState.Prod_Bom_No, formState.isProdBomFromItem, isViewMode]);

  // Handlers
  const handleChange = (field: string, value: string | number | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleLOBChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      Shortcut_Dimension_1_Code: value,
      Shortcut_Dimension_2_Code: "",
      Shortcut_Dimension_3_Code: "",
      Location_Code: "",
    }));
  };

  const handleBranchChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      Shortcut_Dimension_2_Code: value,
      Shortcut_Dimension_3_Code: "",
      Location_Code: "",
    }));
  };

  const handleLOCChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      Shortcut_Dimension_3_Code: value,
      Location_Code: value, // Prefill Location Code
    }));
  };

  const handleSourceTypeChange = (value: SourceType) => {
    setFormState((prev) => ({
      ...prev,
      Source_Type: value,
      Source_No: "",
      Prod_Bom_No: "",
      BOM_Version_No: "",
      isProdBomFromItem: false,
    }));
  };

  const handleSourceNoChange = async (value: string) => {
    setFormState((prev) => ({
      ...prev,
      Source_No: value,
      Prod_Bom_No: "",
      BOM_Version_No: "",
      isProdBomFromItem: false,
    }));

    // If source type is Item, check if the item has a Production BOM
    if (formState.Source_Type === "Item" && value) {
      try {
        const item = await getItemByNo(value);
        if (item?.Production_BOM_No) {
          // Item has a BOM - use it and make it uneditable
          setFormState((prev) => ({
            ...prev,
            Source_No: value,
            Prod_Bom_No: item.Production_BOM_No || "",
            BOM_Version_No: "",
            isProdBomFromItem: true,
          }));
        } else {
          // No BOM from item - load BOM dropdown options
          setIsLoadingBom(true);
          const boms = await getProdOrderBOMs();
          setBomOptions(boms);
          setIsLoadingBom(false);
        }
      } catch (error) {
        console.error("Error checking item BOM:", error);
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call
      console.log("Submitting Production Order:", formState);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // On success, handle auto-close
      await handleSuccess();
    } catch (error) {
      console.error("Error submitting Production Order:", error);
      // TODO: Show error dialog
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if BOM fields should be shown
  const showBomFields = formState.Source_Type === "Item";
  const isBomEditable =
    showBomFields && !formState.isProdBomFromItem && !isViewMode;
  const showBomVersion =
    showBomFields && !formState.isProdBomFromItem && formState.Prod_Bom_No;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6">
          {/* Dimension Fields */}
          <FormSection title="Dimension">
            <div className="grid grid-cols-3 gap-4">
              <SelectField
                label="LOB"
                value={formState.Shortcut_Dimension_1_Code}
                options={lobs.map((l) => ({ value: l.Code, label: l.Code }))}
                onChange={handleLOBChange}
                disabled={isViewMode}
                isLoading={isLoadingDimensions}
                required
              />
              <SelectField
                label="Branch Code"
                value={formState.Shortcut_Dimension_2_Code}
                options={branches.map((b) => ({
                  value: b.Code,
                  label: b.Code,
                }))}
                onChange={handleBranchChange}
                disabled={isViewMode || !formState.Shortcut_Dimension_1_Code}
                required
              />
              <SelectField
                label="LOC Code"
                value={formState.Shortcut_Dimension_3_Code}
                options={locs.map((l) => ({ value: l.Code, label: l.Code }))}
                onChange={handleLOCChange}
                disabled={isViewMode || !formState.Shortcut_Dimension_2_Code}
                required
              />
            </div>
          </FormSection>

          {/* General Information */}
          <FormSection title="General Information">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Order No"
                value={formState.No}
                onChange={(v) => handleChange("No", v)}
                disabled={!isCreateMode}
                placeholder={isCreateMode ? "Auto-generated" : ""}
              />
              <FormField
                label="Description"
                value={formState.Description}
                onChange={(v) => handleChange("Description", v)}
                disabled={isViewMode}
                required
              />
            </div>
          </FormSection>

          {/* Source Details */}
          <FormSection title="Source Details">
            <div className="grid grid-cols-3 gap-4">
              <SelectField
                label="Source Type"
                value={formState.Source_Type}
                options={SOURCE_TYPE_OPTIONS.filter(Boolean).map((st) => ({
                  value: st,
                  label: st,
                }))}
                onChange={(v) => handleSourceTypeChange(v as SourceType)}
                disabled={isViewMode}
                required
              />
              <SelectField
                label="Source No"
                value={formState.Source_No}
                options={sourceOptions.map((opt) => ({
                  value: opt.No,
                  label:
                    "Description" in opt
                      ? `${opt.No} - ${opt.Description}`
                      : "Sell_to_Customer_Name" in opt
                        ? `${opt.No} - ${opt.Sell_to_Customer_Name}`
                        : opt.No,
                }))}
                onChange={handleSourceNoChange}
                disabled={isViewMode || !formState.Source_Type}
                isLoading={isLoadingSource}
                required
              />
              <FormField
                label="Quantity"
                value={formState.Quantity}
                onChange={(v) => handleChange("Quantity", parseFloat(v) || 0)}
                disabled={isViewMode}
                type="number"
                required
              />
            </div>
          </FormSection>

          {/* Dates & Location */}
          <FormSection title="Dates & Location">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                label="Due Date"
                value={formState.Due_Date}
                onChange={(v) => handleChange("Due_Date", v)}
                disabled={isViewMode}
                type="date"
                required
              />
              <SelectField
                label="Location Code"
                value={formState.Location_Code}
                options={locs.map((l) => ({ value: l.Code, label: l.Code }))}
                onChange={(v) => handleChange("Location_Code", v)}
                disabled={isViewMode}
                required
              />
              <FormField
                label="Hatching Date"
                value={formState.Hatching_Date}
                onChange={(v) => handleChange("Hatching_Date", v)}
                disabled={isViewMode}
                type="date"
              />
            </div>
          </FormSection>

          {/* BOM Fields - Only for Item source type */}
          {showBomFields && (
            <FormSection title="Production BOM">
              <div className="grid grid-cols-2 gap-4">
                {formState.isProdBomFromItem ? (
                  <FormField
                    label="Prod. BOM No"
                    value={formState.Prod_Bom_No}
                    onChange={() => {}}
                    disabled={true}
                    helpText="Auto-filled from selected item"
                  />
                ) : (
                  <SelectField
                    label="Prod. BOM No"
                    value={formState.Prod_Bom_No}
                    options={bomOptions.map((b) => ({
                      value: b.No,
                      label: b.Description
                        ? `${b.No} - ${b.Description}`
                        : b.No,
                    }))}
                    onChange={(v) => handleChange("Prod_Bom_No", v)}
                    disabled={!isBomEditable}
                    isLoading={isLoadingBom}
                    required
                  />
                )}
                {showBomVersion && (
                  <SelectField
                    label="BOM Version No"
                    value={formState.BOM_Version_No}
                    options={bomVersionOptions.map((v) => ({
                      value: v.Version_Code,
                      label: v.Description
                        ? `${v.Version_Code} - ${v.Description}`
                        : v.Version_Code,
                    }))}
                    onChange={(v) => handleChange("BOM_Version_No", v)}
                    disabled={isViewMode}
                    isLoading={isLoadingBomVersions}
                  />
                )}
              </div>
            </FormSection>
          )}

          {/* Additional Options */}
          <FormSection title="Additional Options">
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Batch Size (In TON)"
                value={formState.Batch_Size}
                options={BATCH_SIZE_OPTIONS.filter(Boolean).map((bs) => ({
                  value: bs,
                  label: bs,
                }))}
                onChange={(v) => handleChange("Batch_Size", v as BatchSize)}
                disabled={isViewMode}
              />
            </div>
          </FormSection>

          {/* Order Lines - Only for view/edit mode */}
          {!isCreateMode && (
            <FormSection title="Release Production Order Line">
              <ProductionOrderLinesTable
                lines={orderLines}
                isLoading={isLoadingLines}
              />
            </FormSection>
          )}

          {/* Order Components - Only for view/edit mode */}
          {!isCreateMode && (
            <FormSection title="Production Order Component">
              <ProductionOrderComponentsTable
                components={orderComponents}
                isLoading={isLoadingComponents}
              />
            </FormSection>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t">
        {isViewMode ? (
          <Button
            onClick={() => {
              setLocalMode("edit");
              updateTab({ context: { ...context, mode: "edit" } });
            }}
            className="w-full"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Order
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCreateMode ? "Create Order" : "Save Changes"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// FORM SECTION COMPONENT
// ============================================
interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

// ============================================
// FORM FIELD COMPONENT (Input)
// ============================================
interface FormFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  type?: "text" | "number" | "date";
  placeholder?: string;
  helpText?: string;
}

function FormField({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  type = "text",
  placeholder,
  helpText,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {disabled ? (
        <div>
          <p className="text-sm py-2 px-3 bg-muted/50 rounded-md min-h-9 flex items-center">
            {value || "-"}
          </p>
          {helpText && (
            <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
          )}
        </div>
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 text-sm"
        />
      )}
    </div>
  );
}

// ============================================
// SELECT FIELD COMPONENT
// ============================================
interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  required = false,
  isLoading = false,
  placeholder = "Select...",
}: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {disabled ? (
        <p className="text-sm py-2 px-3 bg-muted/50 rounded-md min-h-9 flex items-center">
          {value || "-"}
        </p>
      ) : (
        <Select value={value} onValueChange={onChange} disabled={isLoading}>
          <SelectTrigger className="h-9 text-sm">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              <SelectValue placeholder={placeholder} />
            )}
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
