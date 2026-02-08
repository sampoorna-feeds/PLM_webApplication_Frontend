/**
 * Ship-to Address Validation
 * Validation functions for ship-to address form fields
 */

import { getStates, type State } from "@/lib/api/services/state.service";
import {
  getShipToAddresses,
  type ShipToAddress,
} from "@/lib/api/services/shipto.service";

export interface ShipToFormData {
  code: string;
  name: string;
  address?: string;
  address2?: string;
  landmark?: string;
  state?: string;
  city?: string;
  postCode?: string;
  phoneNo?: string;
  contact?: string;
  email?: string;
  locationCode?: string;
}

export interface ValidationState {
  fromPin: number | null;
  toPin: number | null;
  stateName: string | null;
}

// Singleton for validation state (postcode range validation)
let validationState: ValidationState = {
  fromPin: null,
  toPin: null,
  stateName: null,
};

/**
 * Set state validation range for postcode validation
 */
export function setStateValidation(
  fromPin: number,
  toPin: number,
  stateName: string,
): void {
  validationState = {
    fromPin,
    toPin,
    stateName,
  };
}

/**
 * Clear state validation
 */
export function clearValidation(): void {
  validationState = {
    fromPin: null,
    toPin: null,
    stateName: null,
  };
}

/**
 * Check if validation state is set
 */
export function hasValidationState(): boolean {
  return validationState.fromPin !== null && validationState.toPin !== null;
}

/**
 * Validate code field
 * - Required
 * - Must be unique per customer (case-insensitive)
 * - In update mode, excludes current code from check
 */
// Cache for existing addresses to prevent multiple API calls
let addressCache: Map<string, { addresses: any[]; timestamp: number }> =
  new Map();
const CACHE_TTL = 30000; // 30 seconds

export async function validateCode(
  value: string,
  customerNo: string,
  existingCode?: string,
): Promise<string | null> {
  if (!value || value.trim().length === 0) {
    return "Required";
  }

  if (!customerNo) {
    return null; // Can't validate uniqueness without customer
  }

  try {
    // Check cache first
    const cached = addressCache.get(customerNo);
    const now = Date.now();
    let existingAddresses: any[];

    if (cached && now - cached.timestamp < CACHE_TTL) {
      existingAddresses = cached.addresses;
    } else {
      // Fetch from API
      existingAddresses = await getShipToAddresses(customerNo);
      addressCache.set(customerNo, {
        addresses: existingAddresses,
        timestamp: now,
      });
    }

    const isDuplicate = existingAddresses.some(
      (addr) =>
        addr.Code.toLowerCase() === value.toLowerCase().trim() &&
        (!existingCode || addr.Code !== existingCode),
    );

    if (isDuplicate) {
      return "This code already exists. Please use a unique code.";
    }
  } catch (error) {
    console.error("Error validating code uniqueness:", error);
    // Return null on error - don't block user, server will validate
    return null;
  }

  return null;
}

/**
 * Clear address cache (useful after creating/updating addresses)
 */
export function clearAddressCache(customerNo?: string): void {
  if (customerNo) {
    addressCache.delete(customerNo);
  } else {
    addressCache.clear();
  }
}

/**
 * Validate name field
 * - Required
 */
export function validateName(value: string): string | null {
  if (!value || value.trim().length === 0) {
    return "Required";
  }
  return null;
}

/**
 * Validate landmark field
 * - Required (trimmed)
 */
export function validateLandmark(value: string): string | null {
  if (!value || value.trim().length === 0) {
    return "Landmark is required";
  }
  return null;
}

/**
 * Validate state field
 * - Required
 */
export function validateState(value: string): string | null {
  if (!value || value.trim().length === 0) {
    return "State is required";
  }
  return null;
}

/**
 * Validate postcode field
 * - Required
 * - Only digits allowed
 * - Range validation if state selected
 */
export function validatePostCode(value: string): string | null {
  if (!value || value.trim().length === 0) {
    return "Postcode is required";
  }

  // Check if only digits
  if (!/^\d+$/.test(value.trim())) {
    return "Postcode must contain only digits";
  }

  // Range validation if state is selected
  if (
    hasValidationState() &&
    validationState.fromPin !== null &&
    validationState.toPin !== null
  ) {
    const postCode = parseInt(value.trim(), 10);
    if (isNaN(postCode)) {
      return "Invalid postcode";
    }

    const fromRange = validationState.fromPin * 1000;
    const toRange = validationState.toPin * 1000 + 999;

    if (postCode < fromRange || postCode > toRange) {
      const fromStr = fromRange.toString().padStart(6, "0");
      const toStr = toRange.toString().padStart(6, "0");
      return `Post code must be between ${fromStr} and ${toStr}`;
    }
  }

  return null;
}

/**
 * Validate city field
 * - Required only if postcode is filled
 */
export function validateCity(value: string, postCode: string): string | null {
  // City is only required if postcode is filled
  if (postCode && postCode.trim().length > 0) {
    if (!value || value.trim().length === 0) {
      return "City is required when postcode is entered";
    }
  }
  return null;
}

/**
 * Validate phone number field
 * - Optional
 * - Only digits allowed if provided
 */
export function validatePhone(value: string): string | null {
  if (!value || value.trim().length === 0) {
    return null; // Optional field
  }

  if (!/^\d+$/.test(value.trim())) {
    return "Phone number must contain only digits";
  }

  return null;
}

/**
 * Validate email field
 * - Optional
 * - Basic email format validation if provided
 */
export function validateEmail(value: string): string | null {
  if (!value || value.trim().length === 0) {
    return null; // Optional field
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) {
    return "Invalid email format";
  }

  return null;
}

/**
 * Validate entire form
 * Returns object with field errors
 */
export async function validateShipToForm(
  formData: ShipToFormData,
  customerNo: string,
  isUpdateMode: boolean = false,
  existingCode?: string,
): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};

  // Validate code
  const codeError = await validateCode(formData.code, customerNo, existingCode);
  if (codeError) {
    errors.code = codeError;
  }

  // Validate name
  const nameError = validateName(formData.name);
  if (nameError) {
    errors.name = nameError;
  }

  // Validate landmark
  const landmarkError = validateLandmark(formData.landmark || "");
  if (landmarkError) {
    errors.landmark = landmarkError;
  }

  // Validate state
  const stateError = validateState(formData.state || "");
  if (stateError) {
    errors.state = stateError;
  }

  // Validate postcode
  const postCodeError = validatePostCode(formData.postCode || "");
  if (postCodeError) {
    errors.postCode = postCodeError;
  }

  // Validate city (conditional on postcode)
  const cityError = validateCity(formData.city || "", formData.postCode || "");
  if (cityError) {
    errors.city = cityError;
  }

  // Validate phone (optional)
  const phoneError = validatePhone(formData.phoneNo || "");
  if (phoneError) {
    errors.phoneNo = phoneError;
  }

  // Validate email (optional)
  const emailError = validateEmail(formData.email || "");
  if (emailError) {
    errors.email = emailError;
  }

  return errors;
}
