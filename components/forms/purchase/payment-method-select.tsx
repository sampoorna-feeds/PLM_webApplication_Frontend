"use client";

import React, { useCallback, useState, useEffect } from "react";
import { PurchaseSearchableSelect, type PurchaseSearchableSelectOption } from "./purchase-searchable-select";
import { purchaseDropdownsService } from "@/lib/api/services/purchase-dropdowns.service";

interface PaymentMethodSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

export function PaymentMethodSelect({
  value,
  onChange,
  disabled,
  className,
  hasError,
}: PaymentMethodSelectProps) {
  const [options, setOptions] = useState<PurchaseSearchableSelectOption[]>([]);

  const loadOptions = useCallback(async (skip: number, search: string) => {
    try {
      const methods = await purchaseDropdownsService.getPaymentMethodsPage(skip, search, 30);
      return methods.map((m) => ({
        value: m.Code,
        label: m.Code, // Show only Code as per user request
      }));
    } catch (error) {
      console.error("Failed to load payment methods:", error);
      return [];
    }
  }, []);

  // Initial load for the first page
  useEffect(() => {
    let mounted = true;
    loadOptions(0, "").then((initialOptions) => {
      if (mounted) {
        setOptions(initialOptions);
      }
    });
    return () => { mounted = false; };
  }, [loadOptions]);

  return (
    <PurchaseSearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      loadMore={loadOptions}
      disabled={disabled}
      className={className}
      placeholder="Select pmt method"
    />
  );
}
