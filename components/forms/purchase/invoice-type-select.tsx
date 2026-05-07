"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceTypeOption } from "./purchase-document-config";

interface InvoiceTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: InvoiceTypeOption[];
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

export function InvoiceTypeSelect({
  value,
  onChange,
  options,
  disabled,
  className,
  hasError,
}: InvoiceTypeSelectProps) {
  return (
    <Select
      value={value || "_none"}
      onValueChange={(v) => onChange(v === "_none" ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select Invoice Type" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
