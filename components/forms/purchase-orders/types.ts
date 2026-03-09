/**
 * Shared types for Purchase Orders filter system
 */

export interface FilterCondition {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "ge"
    | "lt"
    | "le"
    | "contains"
    | "startswith"
    | "endswith";
  value: string;
  type: "text" | "number" | "date" | "boolean" | "enum";
}
