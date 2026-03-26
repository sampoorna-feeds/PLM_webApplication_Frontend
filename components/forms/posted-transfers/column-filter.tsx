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
import { type ColumnConfig } from "../production-orders/column-config";

interface ColumnFilterProps {
  column: ColumnConfig;
  value: string;
  valueTo?: string;
  onChange: (value: string, valueTo?: string) => void;
}

export function ColumnFilter({
  column,
  value,
  valueTo,
  onChange,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [localValueTo, setLocalValueTo] = useState(valueTo || "");

  const hasFilter = value || valueTo;

  useEffect(() => {
    setLocalValue(value);
    setLocalValueTo(valueTo || "");
  }, [value, valueTo]);

  const handleApply = () => {
    onChange(localValue, localValueTo);
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
      case "number":
        return (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Filter {column.label}</Label>
            <Input
              placeholder={`Enter value...`}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              className="h-8 text-sm"
            />
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

      default:
        return null;
    }
  };

  if (!column.filterType) return null;

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
