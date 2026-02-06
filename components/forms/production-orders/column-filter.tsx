"use client";

import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnConfig, FilterType } from "./column-config";
import {
  STATUS_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  BLOCKED_OPTIONS,
} from "./filter-constants";

interface ColumnFilterProps {
  column: ColumnConfig;
  value: string;
  valueTo?: string; // For date range (end date)
  onChange: (value: string, valueTo?: string) => void;
  options?: { label: string; value: string }[];
}

// Get options for enum columns
function getEnumOptions(columnId: string) {
  switch (columnId) {
    case "Status":
      return STATUS_OPTIONS;
    case "Source_Type":
      return SOURCE_TYPE_OPTIONS;
    default:
      return [];
  }
}

export function ColumnFilter({
  column,
  value,
  valueTo,
  onChange,
  options: propOptions,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [localValueTo, setLocalValueTo] = useState(valueTo || "");
  const [numberOperator, setNumberOperator] = useState<
    "eq" | "gt" | "lt" | "range"
  >("eq");

  const hasFilter = value || valueTo;

  // Sync local state with props
  useEffect(() => {
    setLocalValue(value);
    setLocalValueTo(valueTo || "");
  }, [value, valueTo]);

  const handleApply = () => {
    if (
      column.filterType === "date" ||
      (column.filterType === "number" && numberOperator === "range")
    ) {
      onChange(localValue, localValueTo);
    } else if (column.filterType === "number") {
      // Prefix with operator for number filters
      const prefixedValue = localValue ? `${numberOperator}:${localValue}` : "";
      onChange(prefixedValue);
    } else {
      onChange(localValue);
    }
    setOpen(false);
  };

  const handleClear = () => {
    // Prevent clearing Branch filter completely (at least one must be selected)
    if (column.id === "Shortcut_Dimension_2_Code" && propOptions) {
      // Reset to all selected if user tries to clear
      const allValues = propOptions.map((o) => o.value).join(",");
      setLocalValue(allValues);
      onChange(allValues, "");
    } else {
      setLocalValue("");
      setLocalValueTo("");
      onChange("", "");
    }
    setOpen(false);
  };

  const renderFilterContent = () => {
    switch (column.filterType) {
      case "text":
        return (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Input
              placeholder={`Enter values (comma-separated)...`}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-muted-foreground text-xs">
              Separate multiple values with commas
            </p>
          </div>
        );

      case "enum":
        const options = propOptions || getEnumOptions(column.id);

        // Use Checkbox list if options are explicitly provided (like Branch)
        if (propOptions) {
          const selectedValues = localValue ? localValue.split(",") : [];
          const isBranch = column.id === "Shortcut_Dimension_2_Code";

          const handleCheckboxChange = (
            optionValue: string,
            checked: boolean,
          ) => {
            let newSelected = [...selectedValues];
            if (checked) {
              if (!newSelected.includes(optionValue)) {
                newSelected.push(optionValue);
              }
            } else {
              newSelected = newSelected.filter((v) => v !== optionValue);
            }

            // Constraint: At least one branch must be selected
            if (isBranch && newSelected.length === 0) {
              return; // Prevent unchecking the last item
            }

            setLocalValue(newSelected.join(","));
          };

          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  Filter {column.label}
                </Label>
                {selectedValues.length < propOptions.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary h-auto p-0 text-[10px]"
                    onClick={() =>
                      setLocalValue(propOptions.map((o) => o.value).join(","))
                    }
                  >
                    Select All
                  </Button>
                )}
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto p-1">
                {options.map((option) => {
                  const isChecked = selectedValues.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`filter-${column.id}-${option.value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(option.value, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`filter-${column.id}-${option.value}`}
                        className="cursor-pointer text-xs font-normal"
                      >
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // Fallback for standard enums (Status, Source Type) - Single Select Dropdown
        return (
          <div className="space-y-3">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Select
              value={localValue || "all"}
              onValueChange={(v) => setLocalValue(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem
                    key={option.value || "all"}
                    value={option.value || "all"}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "boolean":
        return (
          <div className="space-y-3">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Select
              value={localValue || "all"}
              onValueChange={(v) => setLocalValue(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {BLOCKED_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value || "all"}
                    value={option.value || "all"}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "date":
        return (
          <div className="space-y-3">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-muted-foreground text-xs">From</Label>
                <Input
                  type="date"
                  value={localValue}
                  onChange={(e) => setLocalValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">To</Label>
                <Input
                  type="date"
                  value={localValueTo}
                  onChange={(e) => setLocalValueTo(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        );

      case "number":
        return (
          <div className="space-y-3">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Select
              value={numberOperator}
              onValueChange={(v) =>
                setNumberOperator(v as "eq" | "gt" | "lt" | "range")
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eq">Equals</SelectItem>
                <SelectItem value="gt">Greater than</SelectItem>
                <SelectItem value="lt">Less than</SelectItem>
                <SelectItem value="range">Range</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder={numberOperator === "range" ? "Min value" : "Value"}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-8 text-sm"
            />
            {numberOperator === "range" && (
              <Input
                type="number"
                placeholder="Max value"
                value={localValueTo}
                onChange={(e) => setLocalValueTo(e.target.value)}
                className="h-8 text-sm"
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!column.filterType) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`hover:bg-background/50 rounded p-0.5 transition-colors ${
            hasFilter
              ? "text-primary"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          <Filter className={`h-3 w-3 ${hasFilter ? "fill-current" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {renderFilterContent()}
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={handleApply}
          >
            Apply
          </Button>
          {hasFilter && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
