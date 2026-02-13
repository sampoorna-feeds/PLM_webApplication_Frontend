"use client";

import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import type { ColumnConfig } from "./column-config";
import { STATUS_OPTIONS, INVOICE_TYPE_OPTIONS } from "./filter-constants";

interface SalesOrderColumnFilterProps {
  column: ColumnConfig;
  value: string;
  valueTo?: string;
  onChange: (value: string, valueTo?: string) => void;
}

function getEnumOptions(columnId: string): { value: string; label: string }[] {
  switch (columnId) {
    case "Status":
      return [...STATUS_OPTIONS];
    case "Invoice_Type":
      return [...INVOICE_TYPE_OPTIONS];
    default:
      return [];
  }
}

export function SalesOrderColumnFilter({
  column,
  value,
  valueTo,
  onChange,
}: SalesOrderColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [localValueTo, setLocalValueTo] = useState(valueTo || "");
  const [numberOperator, setNumberOperator] = useState<
    "eq" | "gt" | "lt" | "range"
  >("eq");

  const hasFilter = !!(value || valueTo);

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
      const prefixedValue = localValue ? `${numberOperator}:${localValue}` : "";
      onChange(prefixedValue);
    } else {
      onChange(localValue);
    }
    setOpen(false);
  };

  const handleClear = () => {
    setLocalValue("");
    setLocalValueTo("");
    onChange("", "");
    setOpen(false);
  };

  const renderFilterContent = () => {
    switch (column.filterType) {
      case "text":
        return (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Input
              placeholder="Enter values (comma-separated)..."
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-muted-foreground text-xs">
              Separate multiple values with commas
            </p>
          </div>
        );

      case "enum": {
        const options = column.filterOptions || getEnumOptions(column.id);
        return (
          <div className="space-y-3">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Select
              value={localValue === "" ? "all" : localValue}
              onValueChange={(v) => setLocalValue(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {options
                  .filter((opt) => opt.value !== "")
                  .map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );
      }

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

  if (!column.filterType) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
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
          <Button size="sm" className="h-7 flex-1 text-xs" onClick={handleApply}>
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
