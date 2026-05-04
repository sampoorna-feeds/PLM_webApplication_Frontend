import { format } from "date-fns";

/**
 * Formats a given date to the global standard "dd/MM/yyyy".
 * Returns a fallback value (e.g. "-" or the original string) if the date is invalid.
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date || date === "0001-01-01" || date === "0001-01-01T00:00:00Z") return "-";
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return String(date);
  return format(parsedDate, "dd/MM/yyyy");
}
