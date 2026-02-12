"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { ColumnVisibility } from "./column-visibility";
import type { ReportLedgerFilters } from "./types";

interface TableFilterBarProps {
  filters: ReportLedgerFilters;
  visibleColumns: string[];
  locationOptions: SearchableSelectOption[];
  itemOptions: SearchableSelectOption[];
  isLoadingLocations?: boolean;
  isLoadingItems?: boolean;
  isLoadingMoreItems?: boolean;
  hasMoreItems?: boolean;
  onFiltersChange: (filters: Partial<ReportLedgerFilters>) => void;
  onApplyFilters: () => void;
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
}: TableFilterBarProps) {
  const hasActiveFilters =
    filters.locationCode ||
    filters.itemNo ||
    filters.postingDateFrom ||
    filters.postingDateTo;

  const canSearch =
    filters.locationCode &&
    filters.itemNo &&
    filters.postingDateFrom &&
    filters.postingDateTo;

  return (
    <div className="space-y-3 pb-3">
      {/* Filter Controls Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Location Code Dropdown */}
        <div className="space-y-1.5">
          <Label htmlFor="location-filter" className="text-xs font-medium">
            Location Code <span className="text-destructive">*</span>
          </Label>
          <SearchableSelect
            value={filters.locationCode}
            onValueChange={(value) => onFiltersChange({ locationCode: value })}
            options={locationOptions}
            placeholder="Select location..."
            searchPlaceholder="Search locations..."
            emptyText="No locations found"
            isLoading={isLoadingLocations}
          />
        </div>

        {/* Item No Dropdown */}
        <div className="space-y-1.5">
          <Label htmlFor="item-filter" className="text-xs font-medium">
            Item No <span className="text-destructive">*</span>
          </Label>
          <SearchableSelect
            value={filters.itemNo}
            onValueChange={(value) => onFiltersChange({ itemNo: value })}
            options={itemOptions}
            placeholder={
              filters.locationCode ? "Select item..." : "Select location first"
            }
            searchPlaceholder="Search items (min 2 chars)..."
            emptyText="No items found"
            isLoading={isLoadingItems}
            isLoadingMore={isLoadingMoreItems}
            onSearch={onItemSearch}
            onLoadMore={onLoadMoreItems}
            hasMore={hasMoreItems}
            disabled={!filters.locationCode}
          />
        </div>

        {/* Posting Date From */}
        <div className="space-y-1.5">
          <Label htmlFor="date-from-filter" className="text-xs font-medium">
            Posting Date From <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date-from-filter"
            type="date"
            value={filters.postingDateFrom}
            onChange={(e) =>
              onFiltersChange({ postingDateFrom: e.target.value })
            }
            className="h-9"
          />
        </div>

        {/* Posting Date To */}
        <div className="space-y-1.5">
          <Label htmlFor="date-to-filter" className="text-xs font-medium">
            Posting Date To <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date-to-filter"
            type="date"
            value={filters.postingDateTo}
            onChange={(e) => onFiltersChange({ postingDateTo: e.target.value })}
            className="h-9"
          />
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Apply Filters Button */}
        <Button
          onClick={onApplyFilters}
          size="sm"
          disabled={!canSearch}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Search
        </Button>

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

        {/* Column Visibility */}
        <ColumnVisibility
          visibleColumns={visibleColumns}
          onColumnToggle={onColumnToggle}
          onResetColumns={onResetColumns}
          onShowAllColumns={onShowAllColumns}
        />
      </div>
    </div>
  );
}
