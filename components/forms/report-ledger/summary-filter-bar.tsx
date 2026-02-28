"use client";

import { useState } from "react";
import { Search, X, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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
  const [locationSearch, setLocationSearch] = useState("");

  const hasRequiredFilters =
    filters.locationCodes.length > 0 &&
    filters.postingDateFrom &&
    filters.postingDateTo;

  const handleLocationToggle = (code: string) => {
    const current = filters.locationCodes;
    const updated = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    onFiltersChange({ locationCodes: updated });
  };

  const handleSelectAllLocations = () => {
    const allCodes = locationOptions.map((opt) => opt.value);
    const allSelected = allCodes.length === filters.locationCodes.length;
    onFiltersChange({ locationCodes: allSelected ? [] : allCodes });
  };

  const filteredLocationOptions = locationSearch
    ? locationOptions.filter((opt) =>
        opt.label.toLowerCase().includes(locationSearch.toLowerCase()),
      )
    : locationOptions;

  return (
    <div className="bg-card rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Location Multi-Select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={isLoadingLocations}
            >
              {isLoadingLocations ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Search className="h-3 w-3" />
              )}
              Locations
              {filters.locationCodes.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 rounded-full px-1.5 text-[10px]"
                >
                  {filters.locationCodes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <div className="border-b p-2">
              <Input
                placeholder="Search locations..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {/* Select All */}
              <div
                className="hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs"
                onClick={handleSelectAllLocations}
              >
                <Checkbox
                  checked={
                    locationOptions.length > 0 &&
                    filters.locationCodes.length === locationOptions.length
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="font-medium">Select All</span>
              </div>
              {filteredLocationOptions.map((opt) => (
                <div
                  key={opt.value}
                  className="hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs"
                  onClick={() => handleLocationToggle(opt.value)}
                >
                  <Checkbox
                    checked={filters.locationCodes.includes(opt.value)}
                    className="h-3.5 w-3.5"
                  />
                  {opt.label}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date From */}
        <div className="flex items-center gap-1">
          <Label className="text-muted-foreground text-xs">From:</Label>
          <DateInput
            value={filters.postingDateFrom}
            onChange={(val) => onFiltersChange({ postingDateFrom: val })}
            placeholder="DD/MM/YYYY"
            className="h-8 w-32 text-xs"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-1">
          <Label className="text-muted-foreground text-xs">To:</Label>
          <DateInput
            value={filters.postingDateTo}
            onChange={(val) => onFiltersChange({ postingDateTo: val })}
            placeholder="DD/MM/YYYY"
            className="h-8 w-32 text-xs"
          />
        </div>

        {/* Apply / Clear */}
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={onApplyFilters}
          disabled={!hasRequiredFilters || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Loading...
            </>
          ) : (
            "Apply"
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={onClearFilters}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>

        {/* Loading message / Results count */}
        <div className="ml-auto flex items-center gap-2">
          {isLoading && loadingMessage && (
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              {loadingMessage}
            </span>
          )}
          {!isLoading && totalCount > 0 && (
            <span className="text-muted-foreground text-xs">
              {totalCount.toLocaleString()} items
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
