import { toast } from "sonner";

/**
 * Shared error message utilities
 * Cleans API/ERP error messages (e.g. strips CorrelationId) for display
 */

/** Regex to strip " CorrelationId: <uuid>" or " CorrelationId: <uuid>." or any technical noise starting with CorrelationId */
const CORRELATION_ID_PATTERN = /\s*CorrelationId:.*$/i;

/** Regex to strip general technical noise like OData prefixes if they leak */
const ODATA_PREFIX_PATTERN = /^Microsoft\.Dynamics\.Nav\.Runtime\.\w+:\s*/i;

/**
 * Removes CorrelationId and trailing noise from API error messages.
 * Example: "Blank Line and Unit price... CorrelationId: 73e41f10-b9ff-4ebc-bcb5-5f4c5b32d92e."
 *       -> "Blank Line and Unit price..."
 */
export function cleanApiErrorMessage(
  message: string | undefined | null,
): string {
  if (message == null || typeof message !== "string") return "";
  
  let cleaned = message;
  
  // Remove CorrelationId and anything after it (it's always technical noise)
  cleaned = cleaned.replace(CORRELATION_ID_PATTERN, "");
  
  // Remove OData prefixes
  cleaned = cleaned.replace(ODATA_PREFIX_PATTERN, "");
  
  // Clean up trailing dots and whitespace
  return cleaned.trim().replace(/\.+$/, "");
}

/**
 * Extract error details from any caught error.
 * Handles ApiError objects (thrown by apiRequest as plain objects),
 * Error instances, and unknown types.
 */
export function extractApiError(error: unknown): {
  message: string;
  code?: string;
  status?: number;
} {
  let message = "An unknown error occurred";
  let code: string | undefined;
  let status: number | undefined;

  // Handle ApiError objects (thrown by apiRequest as plain objects)
  if (error && typeof error === "object") {
    const e = error as { message?: string; code?: string; status?: number };
    message = e.message || message;
    code = e.code;
    status = e.status;
  }
  // Handle Error instances
  else if (error instanceof Error) {
    message = error.message;
  }
  // Fallback
  else if (error) {
    message = String(error);
  }

  // Clean up BC CorrelationId noise from the message using centralized logic
  message = cleanApiErrorMessage(message);

  return { message, code, status };
}

/**
 * Builds a user-safe error message from unknown thrown values.
 * Supports API-shaped objects with optional `message` and `details` fields.
 */
export function getErrorMessage(error: unknown, fallback: string = "An unexpected error occurred."): string {
  const { message } = extractApiError(error);
  
  if (message === "An unknown error occurred" || !message) {
    return fallback;
  }

  if (error && typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    
    // If there are details, append them if they are also strings
    // BUT only if they don't look like technical raw JSON from BC
    if (typeof errObj.details === "string") {
      const details = errObj.details.trim();
      const isJson = (details.startsWith("{") && details.endsWith("}")) || (details.startsWith("[") && details.endsWith("]"));
      
      if (!isJson) {
        const detailMessage = cleanApiErrorMessage(details);
        if (detailMessage && detailMessage !== message && !message.includes(detailMessage)) {
          // Only append if it's different and not too technical
          return `${message}\n${detailMessage}`;
        }
      }
    }
  }

  return message;
}

/**
 * Convenience wrapper for toast.error that automatically sanitizes the error message.
 * Use this instead of toast.error(err.message) to ensure technical noise is masked.
 */
export function toastError(error: unknown, fallback?: string) {
  const message = getErrorMessage(error, fallback);
  return toast.error(message);
}

