"use client";

import { useState } from "react";
import { Search, X, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { SummaryFilters } from "./use-inventory-summary";

interface SummaryFilterBarProps {
  filters: SummaryFilters;
  locationOptions: { label: string; value: string }[];
  isLoadingLocations: boolean;
  totalCount: number;
  isLoading: boolean;
  loadingMessage: string;
  onFiltersChange: (filters: Partial<SummaryFilters>) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

export function SummaryFilterBar({
  filters,
  locationOptions,
  isLoadingLocations,
  totalCount,
  isLoading,
  loadingMessage,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
}: SummaryFilterBarProps) {
  const [locPopoverOpen, setLocPopoverOpen] = useState(false);

  const hasActiveFilters =
    filters.locationCodes.length > 0 ||
    filters.postingDateFrom ||
    filters.postingDateTo;

  // Location multi-select helpers
  const knownCodes = new Set(locationOptions.map((opt) => opt.value));
  const standardSelected = filters.locationCodes.filter((c) =>
    knownCodes.has(c),
  );
  const customSelected = filters.locationCodes.filter(
    (c) => !knownCodes.has(c),
  );
  const allSelected =
    locationOptions.length > 0 &&
    standardSelected.length === locationOptions.length;
  const noneSelected = filters.locationCodes.length === 0;

  const toggleLocation = (code: string) => {
    const current = filters.locationCodes;
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    onFiltersChange({ locationCodes: next });
  };

  const selectAllLocations = () => {
    // Keep custom codes, add all standard ones
    const allStandard = locationOptions.map((opt) => opt.value);
    const merged = [...new Set([...customSelected, ...allStandard])];
    onFiltersChange({ locationCodes: merged });
  };

  const deselectAllLocations = () => {
    onFiltersChange({ locationCodes: [] });
  };

  // Location trigger text — distinguish custom vs standard
  const locationTriggerText = (() => {
    if (isLoadingLocations) return "Loading...";
    if (noneSelected) return "Select locations...";
    const parts: string[] = [];
    if (customSelected.length > 0)
      parts.push(`${customSelected.length} custom`);
    if (allSelected) {
      parts.push(`all ${locationOptions.length} selected`);
    } else {
      parts.push(
        `${standardSelected.length}/${locationOptions.length} selected`,
      );
    }
    return parts.join(", ");
  })();

  return (
    <div className="space-y-3 pb-3">
      {/* Filter Controls Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {/* Location Code Multi-Select */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Location Code <span className="text-destructive">*</span>
          </Label>
          <Popover open={locPopoverOpen} onOpenChange={setLocPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={locPopoverOpen}
                className={cn(
                  "w-full justify-between font-normal",
                  noneSelected && "text-muted-foreground",
                )}
                disabled={isLoadingLocations}
              >
                <span className="truncate">{locationTriggerText}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] min-w-[240px] p-0"
              align="start"
            >
              {/* Select All / Deselect All */}
              <div className="flex items-center justify-between border-b px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={selectAllLocations}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={deselectAllLocations}
                >
                  Deselect All
                </Button>
              </div>
              {/* Checkbox List */}
              <div className="max-h-[200px] overflow-y-auto p-1">
                {locationOptions.map((option) => {
                  const isChecked = filters.locationCodes.includes(
                    option.value,
                  );
                  return (
                    <label
                      key={option.value}
                      className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleLocation(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
                {locationOptions.length === 0 && !isLoadingLocations && (
                  <div className="text-muted-foreground py-4 text-center text-sm">
                    No locations available
                  </div>
                )}
              </div>
              {/* Temporary: custom value input for testing */}
              <div className="border-t px-3 py-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = (
                      e.target as HTMLFormElement
                    ).elements.namedItem("customLoc") as HTMLInputElement;
                    const val = input.value.trim().toUpperCase();
                    if (val && !filters.locationCodes.includes(val)) {
                      onFiltersChange({
                        locationCodes: [...filters.locationCodes, val],
                      });
                    }
                    input.value = "";
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    name="customLoc"
                    placeholder="Custom code..."
                    className="border-input bg-background h-7 flex-1 rounded border px-2 text-xs"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    Add
                  </Button>
                </form>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Posting Date From */}
        <div className="space-y-1.5">
          <Label htmlFor="summary-date-from" className="text-xs font-medium">
            Posting Date From <span className="text-destructive">*</span>
          </Label>
          <DateInput
            id="summary-date-from"
            value={filters.postingDateFrom}
            onChange={(value) => onFiltersChange({ postingDateFrom: value })}
            placeholder="DD/MM/YYYY"
            className="h-9"
          />
        </div>

        {/* Posting Date To */}
        <div className="space-y-1.5">
          <Label htmlFor="summary-date-to" className="text-xs font-medium">
            Posting Date To <span className="text-destructive">*</span>
          </Label>
          <DateInput
            id="summary-date-to"
            value={filters.postingDateTo}
            onChange={(value) => onFiltersChange({ postingDateTo: value })}
            placeholder="DD/MM/YYYY"
            className="h-9"
          />
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Apply Filters Button — always active */}
        <Button onClick={onApplyFilters} size="sm" className="gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isLoading ? "Loading..." : "Search"}
        </Button>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Reset Filters
          </Button>
        )}

        <div className="flex-1" />

        {/* Loading / Count indicator */}
        {isLoading && loadingMessage && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            {loadingMessage}
          </span>
        )}
      </div>
    </div>
  );
}
