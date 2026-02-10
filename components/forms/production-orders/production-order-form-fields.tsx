"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/contexts/auth-context";
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
import type {
  ProductionOrderFormData,
  SheetMode,
  SourceType,
  BatchSize,
} from "./types";
import { SOURCE_TYPE_OPTIONS, BATCH_SIZE_OPTIONS } from "./types";

interface ProductionOrderFormFieldsProps {
  data: ProductionOrderFormData;
  mode: SheetMode;
  onChange: (data: ProductionOrderFormData) => void;
}

export function ProductionOrderFormFields({
  data,
  mode,
  onChange,
}: ProductionOrderFormFieldsProps) {
  const { userID } = useAuth();
  const isReadOnly = mode === "view";

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

  // Handle field changes
  const handleChange = useCallback(
    (
      field: keyof ProductionOrderFormData,
      value: string | number | boolean,
    ) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  // Load LOBs on mount
  useEffect(() => {
    if (!userID || isReadOnly) return;

    const loadLOBs = async () => {
      setIsLoadingDimensions(true);
      try {
        const lobData = await getLOBsFromUserSetup(userID);
        setLobs(lobData);
      } catch (error) {
        console.error("Error loading LOBs:", error);
      } finally {
        setIsLoadingDimensions(false);
      }
    };

    loadLOBs();
  }, [userID, isReadOnly]);

  // Load Branches when LOB changes
  useEffect(() => {
    if (!userID || !data.Shortcut_Dimension_1_Code || isReadOnly) {
      setBranches([]);
      return;
    }

    const loadBranches = async () => {
      try {
        const branchData = await getBranchesFromUserSetup(
          data.Shortcut_Dimension_1_Code,
          userID,
        );
        setBranches(branchData);
      } catch (error) {
        console.error("Error loading branches:", error);
      }
    };

    loadBranches();
  }, [userID, data.Shortcut_Dimension_1_Code, isReadOnly]);

  // Load LOCs when Branch changes
  useEffect(() => {
    if (
      !userID ||
      !data.Shortcut_Dimension_1_Code ||
      !data.Shortcut_Dimension_2_Code ||
      isReadOnly
    ) {
      setLocs([]);
      return;
    }

    const loadLOCs = async () => {
      try {
        const locData = await getLOCsFromUserSetup(
          data.Shortcut_Dimension_1_Code,
          data.Shortcut_Dimension_2_Code,
          userID,
        );
        setLocs(locData);
      } catch (error) {
        console.error("Error loading LOCs:", error);
      }
    };

    loadLOCs();
  }, [
    userID,
    data.Shortcut_Dimension_1_Code,
    data.Shortcut_Dimension_2_Code,
    isReadOnly,
  ]);

  // Prefill Location_Code when LOC changes
  useEffect(() => {
    if (data.Shortcut_Dimension_3_Code && !data.Location_Code) {
      handleChange("Location_Code", data.Shortcut_Dimension_3_Code);
    }
  }, [data.Shortcut_Dimension_3_Code, data.Location_Code, handleChange]);

  // Load Source No options when Source Type changes
  useEffect(() => {
    if (!data.Source_Type || isReadOnly) {
      setSourceOptions([]);
      return;
    }

    const loadSourceOptions = async () => {
      setIsLoadingSource(true);
      try {
        let options: (Item | Family | SalesHeader)[] = [];
        switch (data.Source_Type) {
          case "Item":
            options = await getItems(undefined, data.Shortcut_Dimension_1_Code);
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
  }, [data.Source_Type, data.Shortcut_Dimension_1_Code, isReadOnly]);

  // Handle Source Type change - reset dependent fields
  const handleSourceTypeChange = (value: SourceType) => {
    onChange({
      ...data,
      Source_Type: value,
      Source_No: "",
      Prod_Bom_No: "",
      BOM_Version_No: "",
      isProdBomFromItem: false,
    });
  };

  // Handle Source No change - check for item's Production BOM
  const handleSourceNoChange = async (value: string) => {
    onChange({
      ...data,
      Source_No: value,
      Prod_Bom_No: "",
      BOM_Version_No: "",
      isProdBomFromItem: false,
    });

    // If source type is Item, check if the item has a Production BOM
    if (data.Source_Type === "Item" && value) {
      try {
        const item = await getItemByNo(value);
        if (item?.Production_BOM_No) {
          // Item has a BOM - use it and make it uneditable
          onChange({
            ...data,
            Source_No: value,
            Prod_Bom_No: item.Production_BOM_No,
            BOM_Version_No: "",
            isProdBomFromItem: true,
          });
        } else {
          // No BOM from item - load BOM dropdown options filtered by item and location
          if (data.Location_Code) {
            setIsLoadingBom(true);
            try {
              // Fetch BOMs filtered by Item_No AND Location_Code_1 only
              const boms = await getProdOrderBOMs(value, data.Location_Code);
              setBomOptions(boms);

              if (boms.length === 0) {
                console.warn(
                  `No BOMs found for item ${value} at location ${data.Location_Code}`,
                );
              }
            } catch (error) {
              console.error("Error loading BOM options:", error);
              setBomOptions([]);
            } finally {
              setIsLoadingBom(false);
            }
          }
        }
      } catch (error) {
        console.error("Error checking item BOM:", error);
      }
    }
  };

  // Load BOM Versions when Prod BOM No changes (only for manual selection)
  useEffect(() => {
    if (!data.Prod_Bom_No || data.isProdBomFromItem || isReadOnly) {
      setBomVersionOptions([]);
      return;
    }

    const loadBomVersions = async () => {
      setIsLoadingBomVersions(true);
      try {
        const versions = await getProdOrderBOMVersions(data.Prod_Bom_No);
        setBomVersionOptions(versions);
      } catch (error) {
        console.error("Error loading BOM versions:", error);
        setBomVersionOptions([]);
      } finally {
        setIsLoadingBomVersions(false);
      }
    };

    loadBomVersions();
  }, [data.Prod_Bom_No, data.isProdBomFromItem, isReadOnly]);

  // Reset Branch and LOC when LOB changes
  const handleLOBChange = (value: string) => {
    onChange({
      ...data,
      Shortcut_Dimension_1_Code: value,
      Shortcut_Dimension_2_Code: "",
      Shortcut_Dimension_3_Code: "",
      Location_Code: "",
    });
  };

  // Reset LOC when Branch changes
  const handleBranchChange = (value: string) => {
    onChange({
      ...data,
      Shortcut_Dimension_2_Code: value,
      Shortcut_Dimension_3_Code: "",
      Location_Code: "",
    });
  };

  // Check if BOM fields should be shown (only for Item source type)
  const showBomFields = data.Source_Type === "Item";
  // Check if BOM is editable (manual entry needed)
  const isBomEditable = showBomFields && !data.isProdBomFromItem && !isReadOnly;
  // Check if BOM Version should be shown (only when manually filling BOM)
  const showBomVersion =
    showBomFields && !data.isProdBomFromItem && data.Prod_Bom_No;

  return (
    <div className="space-y-6">
      {/* Dimension Fields */}
      <FormSection title="Dimension">
        <SelectField
          label="LOB"
          value={data.Shortcut_Dimension_1_Code}
          options={lobs.map((l) => ({ value: l.Code, label: l.Code }))}
          onChange={handleLOBChange}
          disabled={isReadOnly}
          isLoading={isLoadingDimensions}
          required
        />
        <SelectField
          label="Branch Code"
          value={data.Shortcut_Dimension_2_Code}
          options={branches.map((b) => ({ value: b.Code, label: b.Code }))}
          onChange={(v) => handleBranchChange(v)}
          disabled={isReadOnly || !data.Shortcut_Dimension_1_Code}
          required
        />
        <SelectField
          label="LOC Code"
          value={data.Shortcut_Dimension_3_Code}
          options={locs.map((l) => ({ value: l.Code, label: l.Code }))}
          onChange={(v) => {
            handleChange("Shortcut_Dimension_3_Code", v);
            // Prefill Location Code with LOC value
            handleChange("Location_Code", v);
          }}
          disabled={isReadOnly || !data.Shortcut_Dimension_2_Code}
          required
        />
      </FormSection>

      {/* General Information */}
      <FormSection title="General Information">
        <FormField
          label="Order No"
          value={data.No || ""}
          onChange={(v) => handleChange("No", v)}
          disabled={mode !== "create"}
          placeholder={mode === "create" ? "Auto-generated" : ""}
        />
        <FormField
          label="Description"
          value={data.Description}
          onChange={(v) => handleChange("Description", v)}
          disabled={isReadOnly}
          required
        />
      </FormSection>

      {/* Source Details */}
      <FormSection title="Source Details">
        <SelectField
          label="Source Type"
          value={data.Source_Type}
          options={SOURCE_TYPE_OPTIONS.filter(Boolean).map((st) => ({
            value: st,
            label: st,
          }))}
          onChange={(v) => handleSourceTypeChange(v as SourceType)}
          disabled={isReadOnly}
          required
        />
        <SelectField
          label="Source No"
          value={data.Source_No}
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
          disabled={isReadOnly || !data.Source_Type}
          isLoading={isLoadingSource}
          required
        />
        <FormField
          label="Quantity"
          value={data.Quantity?.toString() || ""}
          onChange={(v) => handleChange("Quantity", v)}
          disabled={isReadOnly}
          type="number"
          placeholder="Enter quantity"
          required
        />
      </FormSection>

      {/* Dates & Location */}
      <FormSection title="Dates & Location">
        <FormField
          label="Due Date"
          value={data.Due_Date}
          onChange={(v) => handleChange("Due_Date", v)}
          disabled={isReadOnly}
          type="date"
          required
        />
        <FormField
          label="Location Code"
          value={data.Location_Code}
          onChange={() => {}}
          disabled
          helpText="Auto-filled from LOC Code"
          required
        />
        <FormField
          label="Hatching Date"
          value={data.Hatching_Date}
          onChange={(v) => handleChange("Hatching_Date", v)}
          disabled={isReadOnly}
          type="date"
        />
      </FormSection>

      {/* BOM Fields - Only for Item source type */}
      {showBomFields && (
        <FormSection title="Production BOM">
          {data.isProdBomFromItem ? (
            <FormField
              label="Prod. BOM No"
              value={data.Prod_Bom_No}
              onChange={() => {}}
              disabled={true}
              helpText="Auto-filled from selected item"
            />
          ) : (
            <SelectField
              label="Prod. BOM No"
              value={data.Prod_Bom_No}
              options={bomOptions.map((b) => ({
                value: b.No,
                label: b.Description ? `${b.No} - ${b.Description}` : b.No,
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
              value={data.BOM_Version_No}
              options={bomVersionOptions.map((v) => ({
                value: v.Version_Code,
                label: v.Description
                  ? `${v.Version_Code} - ${v.Description}`
                  : v.Version_Code,
              }))}
              onChange={(v) => handleChange("BOM_Version_No", v)}
              disabled={isReadOnly}
              isLoading={isLoadingBomVersions}
            />
          )}
        </FormSection>
      )}

      {/* Additional Options */}
      <FormSection title="Additional Options">
        <SelectField
          label="Batch Size (In TON)"
          value={data.Batch_Size}
          options={BATCH_SIZE_OPTIONS.filter(Boolean).map((bs) => ({
            value: bs,
            label: bs,
          }))}
          onChange={(v) => handleChange("Batch_Size", v as BatchSize)}
          disabled={isReadOnly}
        />
      </FormSection>
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
      <h3 className="border-b pb-2 text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-4">{children}</div>
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
  step?: string;
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
  step,
  helpText,
}: FormFieldProps) {
  // For number type, use text input with decimal validation for better UX
  const isNumericInput = type === "number";
  const inputType = isNumericInput ? "text" : type;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isNumericInput) {
      // Allow empty, digits and one decimal point
      if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
        onChange(val);
      }
    } else {
      onChange(val);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {disabled ? (
        <div>
          <p className="bg-muted/50 flex h-9 items-center truncate rounded-md px-3 py-2 text-sm">
            {value || "-"}
          </p>
          {helpText && (
            <p className="text-muted-foreground mt-1 text-xs">{helpText}</p>
          )}
        </div>
      ) : (
        <Input
          type={inputType}
          inputMode={isNumericInput ? "decimal" : undefined}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          step={step}
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
      <Label className="text-muted-foreground text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {disabled ? (
        <p className="bg-muted/50 flex h-9 items-center truncate rounded-md px-3 py-2 text-sm">
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
