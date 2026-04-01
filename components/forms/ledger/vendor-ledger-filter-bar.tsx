"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AccountSelect } from "@/components/forms/account-select";
import { DateInput } from "@/components/ui/date-input";
import type { VendorLedgerFilters } from "@/lib/api/services/vendor-ledger.service";

interface VendorLedgerFilterBarProps {
  filters: VendorLedgerFilters;
  onFilterChange: (newFilters: Partial<VendorLedgerFilters>) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export function VendorLedgerFilterBar({
  filters,
  onFilterChange,
  onClearFilters,
  isLoading = false,
}: VendorLedgerFilterBarProps) {
  const handleVendorChange = (vendorNo: string) => {
    onFilterChange({ vendorNo });
  };

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-card shadow-sm">
      <div className="space-y-2 flex-1 min-w-[200px]">
        <Label htmlFor="vendor-code">Vendor Code</Label>
        <AccountSelect
          accountType="Vendor"
          value={filters.vendorNo || ""}
          onChange={handleVendorChange}
          placeholder="Select vendor..."
          className="w-full h-9"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date-from">From Date</Label>
        <DateInput
          id="date-from"
          value={filters.fromDate}
          onChange={(val) => onFilterChange({ fromDate: val })}
          className="w-[150px] h-9"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date-to">To Date</Label>
        <DateInput
          id="date-to"
          value={filters.toDate}
          onChange={(val) => onFilterChange({ toDate: val })}
          className="w-[150px] h-9"
        />
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="h-9 px-3"
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );
}
