/**
 * Shared types for Sales Documents filter system
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
