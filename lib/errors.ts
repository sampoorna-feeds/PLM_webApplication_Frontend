/**
 * Shared error message utilities
 * Cleans API/ERP error messages (e.g. strips CorrelationId) for display
 */

/** Regex to strip " CorrelationId: <uuid>" or " CorrelationId: <uuid>." from messages */
const CORRELATION_ID_PATTERN = /\s*CorrelationId:\s*[a-f0-9-]+\.?\s*$/i;

/**
 * Removes CorrelationId and trailing noise from API error messages.
 * Example: "Blank Line and Unit price... CorrelationId: 73e41f10-b9ff-4ebc-bcb5-5f4c5b32d92e."
 *       -> "Blank Line and Unit price..."
 */
export function cleanApiErrorMessage(message: string | undefined | null): string {
  if (message == null || typeof message !== "string") return "";
  return message.replace(CORRELATION_ID_PATTERN, "").trim();
}
