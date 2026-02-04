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
import type { ColumnConfig, FilterType } from "./column-config";
import { STATUS_OPTIONS, SOURCE_TYPE_OPTIONS, BLOCKED_OPTIONS } from "./filter-constants";

interface ColumnFilterProps {
  column: ColumnConfig;
  value: string;
  valueTo?: string; // For date range (end date)
  onChange: (value: string, valueTo?: string) => void;
}

// Get options for enum columns
function getEnumOptions(columnId: string) {
  switch (columnId) {
    case 'Status':
      return STATUS_OPTIONS;
    case 'Source_Type':
      return SOURCE_TYPE_OPTIONS;
    default:
      return [];
  }
}

export function ColumnFilter({ column, value, valueTo, onChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [localValueTo, setLocalValueTo] = useState(valueTo || "");
  const [numberOperator, setNumberOperator] = useState<'eq' | 'gt' | 'lt' | 'range'>('eq');
  
  const hasFilter = value || valueTo;

  // Sync local state with props
  useEffect(() => {
    setLocalValue(value);
    setLocalValueTo(valueTo || "");
  }, [value, valueTo]);

  const handleApply = () => {
    if (column.filterType === 'date' || (column.filterType === 'number' && numberOperator === 'range')) {
      onChange(localValue, localValueTo);
    } else if (column.filterType === 'number') {
      // Prefix with operator for number filters
      const prefixedValue = localValue ? `${numberOperator}:${localValue}` : '';
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
      case 'text':
        return (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Input
              placeholder={`Enter values (comma-separated)...`}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-8 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple values with commas
            </p>
          </div>
        );

      case 'enum':
        const options = getEnumOptions(column.id);
        return (
          <div className="space-y-3">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Select value={localValue || "all"} onValueChange={(v) => setLocalValue(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value || "all"} value={option.value || "all"}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'boolean':
        return (
          <div className="space-y-3">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Select value={localValue || "all"} onValueChange={(v) => setLocalValue(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {BLOCKED_OPTIONS.map((option) => (
                  <SelectItem key={option.value || "all"} value={option.value || "all"}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div className="space-y-3">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={localValue}
                  onChange={(e) => setLocalValue(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
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

      case 'number':
        return (
          <div className="space-y-3">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Select value={numberOperator} onValueChange={(v) => setNumberOperator(v as 'eq' | 'gt' | 'lt' | 'range')}>
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
              placeholder={numberOperator === 'range' ? 'Min value' : 'Value'}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-8 text-sm"
            />
            {numberOperator === 'range' && (
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
          className={`p-0.5 rounded hover:bg-background/50 transition-colors ${
            hasFilter ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
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
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleApply}>
            Apply
          </Button>
          {hasFilter && (
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleClear}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
