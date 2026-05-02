/**
 * Converts all string values in an object to uppercase, excluding specific keys.
 * Used to ensure text fields are sent in uppercase to the ERP API.
 */
export function toUpperCaseValues<T extends object>(
  obj: T,
  excludeKeys: string[] = [],
): T {
  const result = { ...obj } as any;
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === "string" && !excludeKeys.includes(key)) {
      result[key] = value.toUpperCase();
    }
  }
  return result;
}
