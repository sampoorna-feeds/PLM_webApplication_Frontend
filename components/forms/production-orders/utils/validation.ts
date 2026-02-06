/**
 * Validation Schemas and Utilities for Production Orders
 */

import { toast } from "sonner";

export interface ProductionOrderFormData {
  No?: string;
  Description: string;
  Shortcut_Dimension_1_Code: string;
  Shortcut_Dimension_2_Code: string;
  Shortcut_Dimension_3_Code: string;
  Source_Type: string;
  Source_No: string;
  Quantity: number | string; // Can be string during form input
  Due_Date: string;
  Location_Code: string;
  Hatching_Date?: string;
  Prod_Bom_No?: string;
  BOM_Version_No?: string;
  isProdBomFromItem?: boolean;
  Batch_Size?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a production order form
 * Returns validation result with all errors
 */
export function validateProductionOrderForm(
  data: ProductionOrderFormData,
): ValidationResult {
  const errors: ValidationError[] = [];

  // Required field validations
  if (!data.Description?.trim()) {
    errors.push({ field: "Description", message: "Description is required" });
  } else if (data.Description.length > 100) {
    errors.push({
      field: "Description",
      message: "Description must be 100 characters or less",
    });
  }

  if (!data.Source_Type) {
    errors.push({ field: "Source_Type", message: "Source Type is required" });
  }

  if (!data.Source_No?.trim()) {
    errors.push({ field: "Source_No", message: "Source No is required" });
  }

  // Parse quantity to number for validation
  const quantityValue =
    typeof data.Quantity === "string"
      ? parseFloat(data.Quantity) || 0
      : data.Quantity || 0;

  if (!quantityValue || quantityValue <= 0) {
    errors.push({
      field: "Quantity",
      message: "Quantity must be greater than 0",
    });
  }

  if (quantityValue > 999999999) {
    errors.push({
      field: "Quantity",
      message: "Quantity exceeds maximum allowed value",
    });
  }

  if (!data.Due_Date) {
    errors.push({ field: "Due_Date", message: "Due Date is required" });
  } else {
    // Validate date is not in the past
    const dueDate = new Date(data.Due_Date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      errors.push({
        field: "Due_Date",
        message: "Due Date cannot be in the past",
      });
    }
  }

  if (!data.Location_Code?.trim()) {
    errors.push({
      field: "Location_Code",
      message: "Location Code is required",
    });
  }

  if (!data.Shortcut_Dimension_1_Code?.trim()) {
    errors.push({
      field: "Shortcut_Dimension_1_Code",
      message: "LOB is required",
    });
  }

  if (!data.Shortcut_Dimension_2_Code?.trim()) {
    errors.push({
      field: "Shortcut_Dimension_2_Code",
      message: "Branch is required",
    });
  }

  if (!data.Shortcut_Dimension_3_Code?.trim()) {
    errors.push({
      field: "Shortcut_Dimension_3_Code",
      message: "LOC is required",
    });
  }

  // BOM is mandatory for production orders
  if (!data.Prod_Bom_No?.trim()) {
    errors.push({
      field: "Prod_Bom_No",
      message: "Production BOM No is required for all production orders",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Shows validation errors as toast messages
 * Returns true if validation passed, false otherwise
 */
export function showValidationErrors(result: ValidationResult): boolean {
  if (result.isValid) return true;

  // Show first error as toast (most important)
  if (result.errors.length > 0) {
    toast.error(result.errors[0].message);
  }

  // Log all errors for debugging
  if (result.errors.length > 1) {
    console.warn("Validation errors:", result.errors);
  }

  return false;
}

/**
 * Validates item tracking assignment
 */
export function validateItemTracking(params: {
  lotNo: string;
  quantity: number;
  maxQuantity?: number;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!params.lotNo?.trim()) {
    errors.push({ field: "lotNo", message: "Lot No. is required" });
  }

  if (!params.quantity || params.quantity <= 0) {
    errors.push({
      field: "quantity",
      message: "Quantity must be greater than 0",
    });
  }

  if (params.maxQuantity && params.quantity > params.maxQuantity) {
    errors.push({
      field: "quantity",
      message: `Quantity cannot exceed remaining quantity (${params.maxQuantity})`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates component update data
 */
export function validateComponentUpdate(params: {
  quantityPer?: number;
  description?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (params.quantityPer !== undefined && params.quantityPer < 0) {
    errors.push({
      field: "quantityPer",
      message: "Quantity Per cannot be negative",
    });
  }

  if (params.description && params.description.length > 100) {
    errors.push({
      field: "description",
      message: "Description must be 100 characters or less",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
