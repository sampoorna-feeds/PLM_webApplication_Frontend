"use client";

import { useState } from "react";
import { Search, X, ChevronsUpDown, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SummaryFilters } from "./use-inventory-summary";
import { DynamicFilterBuilder } from "./dynamic-filter-builder";
import type { FilterCondition } from "./types";

interface SummaryFilterBarProps {
  filters: SummaryFilters;
  locationOptions: { label: string; value: string }[];
  itemOptions: { label: string; value: string; description?: string }[];
  isLoadingLocations: boolean;
  isLoadingItems: boolean;
  isLoadingMoreItems: boolean;
  hasMoreItems: boolean;
  totalCount: number;
  isLoading: boolean;
  loadingMessage: string;
  onFiltersChange: (filters: Partial<SummaryFilters>) => void;
  onItemSearch: (query: string) => void;
  onLoadMoreItems: () => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onExport: () => void;
}

export function SummaryFilterBar({
  filters,
  locationOptions,
  itemOptions,
  isLoadingLocations,
  isLoadingItems,
  isLoadingMoreItems,
  hasMoreItems,
  totalCount,
  isLoading,
  loadingMessage,
  onFiltersChange,
  onItemSearch,
  onLoadMoreItems,
  onApplyFilters,
  onClearFilters,
  onExport,
}: SummaryFilterBarProps) {
  const [locPopoverOpen, setLocPopoverOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const hasActiveFilters =
    filters.locationCodes.length > 0 ||
    filters.postingDateFrom ||
    filters.postingDateTo ||
    (filters.additionalFilters && filters.additionalFilters.length > 0);

  // Filter location options based on search query
  const filteredLocationOptions = locationOptions.filter(
    (opt) =>
      opt.label.toLowerCase().includes(locationSearch.toLowerCase()) ||
      opt.value.toLowerCase().includes(locationSearch.toLowerCase()),
  );

  // Location multi-select helpers
  const allSelected =
    locationOptions.length > 0 &&
    filters.locationCodes.length === locationOptions.length;
  const noneSelected = filters.locationCodes.length === 0;

  const toggleLocation = (code: string) => {
    const current = filters.locationCodes;
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    onFiltersChange({ locationCodes: next });
  };

  const selectAllLocations = () => {
    const filteredCodes = filteredLocationOptions.map((opt) => opt.value);
    const merged = [...new Set([...filters.locationCodes, ...filteredCodes])];
    onFiltersChange({ locationCodes: merged });
  };

  const deselectAllLocations = () => {
    if (locationSearch.trim()) {
      const filteredCodes = new Set(filteredLocationOptions.map((opt) => opt.value));
      const remaining = filters.locationCodes.filter((c) => !filteredCodes.has(c));
      onFiltersChange({ locationCodes: remaining });
    } else {
      onFiltersChange({ locationCodes: [] });
    }
  };

  const handleAddAdditionalFilter = (filter: FilterCondition) => {
    const current = filters.additionalFilters || [];
    onFiltersChange({ additionalFilters: [...current, filter] });
  };

  const handleRemoveAdditionalFilter = (index: number) => {
    const current = filters.additionalFilters || [];
    onFiltersChange({
      additionalFilters: current.filter((_, i) => i !== index),
    });
  };

  // Location trigger text
  const locationTriggerText = (() => {
    if (isLoadingLocations) return "Loading...";
    if (noneSelected) return "Select locations...";
    if (allSelected) {
      return `all ${locationOptions.length} selected`;
    }
    return `${filters.locationCodes.length}/${locationOptions.length} selected`;
  })();

  return (
    <div className="space-y-3 pb-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Location Code Multi-Select */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Location Code <span className="text-destructive">*</span>
          </Label>
          <Popover
            open={locPopoverOpen}
            onOpenChange={(open) => {
              setLocPopoverOpen(open);
              if (!open) setLocationSearch("");
            }}
          >
            <PopoverAnchor asChild>
              <div
                onClick={() => !isLoadingLocations && setLocPopoverOpen(true)}
                className={cn(
                  "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring cursor-pointer",
                  isLoadingLocations && "opacity-50 cursor-not-allowed"
                )}
              >
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    if (!locPopoverOpen) setLocPopoverOpen(true);
                  }}
                  onFocus={() => !isLoadingLocations && setLocPopoverOpen(true)}
                  placeholder={locationTriggerText}
                  disabled={isLoadingLocations}
                  className="w-full bg-transparent focus:outline-none text-sm placeholder:text-foreground/80 truncate cursor-text"
                />
                {locationSearch ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocationSearch("");
                    }}
                    className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={isLoadingLocations}
                      className="ml-2 shrink-0 text-muted-foreground/50 hover:text-foreground"
                    >
                      <ChevronsUpDown className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                )}
              </div>
            </PopoverAnchor>
            <PopoverContent
              className="w-[--radix-popover-anchor-width] min-w-[240px] p-0"
              align="start"
            >
              {/* Select All / Deselect All */}
              <div className="flex items-center justify-between border-b px-3 py-1.5">
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
                {filteredLocationOptions.map((option) => {
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
                {filteredLocationOptions.length === 0 && !isLoadingLocations && (
                  <div className="text-muted-foreground py-4 text-center text-sm">
                    No locations available
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Item No (Main Filter) */}
        <div className="space-y-1.5">
          <Label htmlFor="summary-item-no" className="text-xs font-medium">
            Item No
          </Label>
          <SearchableSelect
            options={itemOptions}
            value={filters.itemNo}
            onValueChange={(val: string) => onFiltersChange({ itemNo: val })}
            onSearch={onItemSearch}
            isLoading={isLoadingItems}
            isLoadingMore={isLoadingMoreItems}
            hasMore={hasMoreItems}
            onLoadMore={onLoadMoreItems}
            placeholder={
              filters.locationCodes.length === 0
                ? "Select a location first..."
                : "Search Item No..."
            }
            searchPlaceholder="Type to search items..."
            emptyText={
              filters.locationCodes.length === 0
                ? "Please select a location above to see available items."
                : "No items found."
            }
            disabled={filters.locationCodes.length === 0}
            className="h-9 w-full"
          />
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
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {/* Apply Filters Button — always active */}
        <Button onClick={onApplyFilters} size="sm" className="gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isLoading ? "Loading..." : "Search"}
        </Button>

        {/* Dynamic Filters Builder */}
        <DynamicFilterBuilder
          filters={filters.additionalFilters || []}
          onAddFilter={handleAddAdditionalFilter}
          onRemoveFilter={handleRemoveAdditionalFilter}
          excludedFields={["Item_No", "Location_Code", "Posting_Date"]}
          topFields={[]}
        />

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

        {/* Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isLoading || totalCount === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>

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
