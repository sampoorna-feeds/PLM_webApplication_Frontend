"use client";

import { useState } from "react";
import { Search, X, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { DateInput } from "@/components/ui/date-input";
import { ColumnVisibility } from "./column-visibility";
import { DynamicFilterBuilder } from "./dynamic-filter-builder";
import type { ReportLedgerFilters, FilterCondition } from "./types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ExportProgressDialog } from "./export-progress-dialog";
import { ALL_COLUMNS } from "./column-config";
import { Download } from "lucide-react";

interface TableFilterBarProps {
  filters: ReportLedgerFilters;
  visibleColumns: string[];
  locationOptions: SearchableSelectOption[];
  itemOptions: SearchableSelectOption[];
  currentFilterString: string;
  totalCount: number;
  humanReadableFilters: string[];
  isLoadingLocations?: boolean;
  isLoadingItems?: boolean;
  isLoadingMoreItems?: boolean;
  hasMoreItems?: boolean;
  onFiltersChange: (filters: Partial<ReportLedgerFilters>) => void;
  onApplyFilters: () => void;
  onApplyAdditionalFilters?: (filters: FilterCondition[]) => void;
  onClearFilters: () => void;
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
  onItemSearch?: (query: string) => void;
  onLoadMoreItems?: () => void;
}

export function TableFilterBar({
  filters,
  visibleColumns,
  locationOptions,
  itemOptions,
  currentFilterString,
  totalCount,
  humanReadableFilters,
  isLoadingLocations = false,
  isLoadingItems = false,
  isLoadingMoreItems = false,
  hasMoreItems = false,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
  onItemSearch,
  onLoadMoreItems,
  onApplyAdditionalFilters,
}: TableFilterBarProps) {
  const [locPopoverOpen, setLocPopoverOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const hasActiveFilters =
    filters.locationCodes.length > 0 ||
    filters.itemNo ||
    filters.postingDateFrom ||
    filters.postingDateTo;

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
    const updated = [...current, filter];
    if (onApplyAdditionalFilters) {
      onApplyAdditionalFilters(updated);
    } else {
      onFiltersChange({ additionalFilters: updated });
    }
  };

  const handleRemoveAdditionalFilter = (index: number) => {
    const current = filters.additionalFilters || [];
    const updated = current.filter((_, i) => i !== index);
    if (onApplyAdditionalFilters) {
      onApplyAdditionalFilters(updated);
    } else {
      onFiltersChange({ additionalFilters: updated });
    }
  };

  // Location trigger text
  const locationTriggerText = (() => {
    if (isLoadingLocations) return "Loading...";
    if (noneSelected) return "Select locations...";
    if (allSelected) {
      return `All ${locationOptions.length} selected`;
    }
    return `${filters.locationCodes.length}/${locationOptions.length} selected`;
  })();

  return (
    <div className="space-y-3 pb-3">
      {/* Filter Controls Grid */}
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

        {/* Item No Dropdown (Optional) */}
        <div className="space-y-1.5">
          <Label htmlFor="item-filter" className="text-xs font-medium">
            Item No
          </Label>
          <SearchableSelect
            value={filters.itemNo}
            onValueChange={(value) => onFiltersChange({ itemNo: value })}
            options={itemOptions}
            placeholder={
              filters.locationCodes.length > 0
                ? "All items (optional)"
                : "Select location first"
            }
            searchPlaceholder="Search items (min 2 chars)..."
            emptyText="No items found"
            isLoading={isLoadingItems}
            isLoadingMore={isLoadingMoreItems}
            onSearch={onItemSearch}
            onLoadMore={onLoadMoreItems}
            hasMore={hasMoreItems}
            disabled={filters.locationCodes.length === 0}
            allowCustomValue={true}
          />
        </div>

        {/* Posting Date From */}
        <div className="space-y-1.5">
          <Label htmlFor="date-from-filter" className="text-xs font-medium">
            Posting Date From
          </Label>
          <DateInput
            id="date-from-filter"
            value={filters.postingDateFrom}
            onChange={(value) => onFiltersChange({ postingDateFrom: value })}
            placeholder="DD/MM/YYYY"
            className="h-9"
          />
        </div>

        {/* Posting Date To */}
        <div className="space-y-1.5">
          <Label htmlFor="date-to-filter" className="text-xs font-medium">
            Posting Date To
          </Label>
          <DateInput
            id="date-to-filter"
            value={filters.postingDateTo}
            onChange={(value) => onFiltersChange({ postingDateTo: value })}
            placeholder="DD/MM/YYYY"
            className="h-9"
          />
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Apply Filters Button */}
        <Button onClick={onApplyFilters} size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>

        {/* Dynamic Filters Builder */}
        <DynamicFilterBuilder
          filters={filters.additionalFilters || []}
          onAddFilter={handleAddAdditionalFilter}
          onRemoveFilter={handleRemoveAdditionalFilter}
        />

        {/* Clear Filters */}
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
          className="gap-2"
          onClick={() => setExportDialogOpen(true)}
          disabled={totalCount === 0}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>

        {/* Column Visibility */}
        <ColumnVisibility
          visibleColumns={visibleColumns}
          onColumnToggle={onColumnToggle}
          onResetColumns={onResetColumns}
          onShowAllColumns={onShowAllColumns}
        />
      </div>

      {/* Export Progress Dialog */}
      <ExportProgressDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        filterString={currentFilterString}
        totalRecords={totalCount}
        humanReadableFilters={humanReadableFilters}
        visibleColumns={visibleColumns}
      />
    </div>
  );
}
