/**
 * OData Filter Utilities
 * Centralized logic for building OData filter strings
 */

/**
 * Escapes single quotes in a string for use in an OData filter value.
 */
export function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Builds a text filter that supports multiple values (comma-separated).
 * Generates: (contains(field,'val1') or contains(field,'val2'))
 */
export function buildTextFilter(field: string, value: string): string {
  const values = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
    
  if (values.length === 0) return "";
  
  if (values.length === 1) {
    const escaped = escapeODataValue(values[0]);
    return `contains(${field},'${escaped}')`;
  }
  
  const orConditions = values.map((v) => {
    const escaped = escapeODataValue(v);
    return `contains(${field},'${escaped}')`;
  });
  
  return `(${orConditions.join(" or ")})`;
}

/**
 * Builds an equality filter that supports multiple values (comma-separated).
 * Generates: (field eq 'val1' or field eq 'val2')
 */
export function buildEnumFilter(field: string, value: string): string {
  const values = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
    
  if (values.length === 0) return "";
  
  if (values.length === 1) {
    const escaped = escapeODataValue(values[0]);
    return `${field} eq '${escaped}'`;
  }
  
  const orConditions = values.map((v) => {
    const escaped = escapeODataValue(v);
    return `${field} eq '${escaped}'`;
  });
  
  return `(${orConditions.join(" or ")})`;
}

/**
 * Builds a numeric filter, optionally with range support.
 */
export function buildNumberFilter(
  field: string,
  value: string,
  valueTo?: string,
): string[] {
  const parts: string[] = [];
  if (valueTo) {
    if (value) parts.push(`${field} ge ${value}`);
    parts.push(`${field} le ${valueTo}`);
  } else if (value) {
    const [operator, numValue] = value.includes(":")
      ? value.split(":")
      : ["eq", value];
      
    switch (operator) {
      case "gt":
        parts.push(`${field} gt ${numValue}`);
        break;
      case "lt":
        parts.push(`${field} lt ${numValue}`);
        break;
      default:
        parts.push(`${field} eq ${numValue}`);
    }
  }
  return parts;
}
