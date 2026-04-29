"use client";

/**
 * PurchaserSelect component for Purchase forms
 * Opens a Dialog with a searchable, sortable table.
 * Columns: Code, Name
 */

import React, { useCallback } from "react";
import { UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GenericLookupModal } from "../shared/generic-lookup-modal";
import { 
  getPurchasersPage, 
  type Purchaser 
} from "@/lib/api/services/purchaser.service";

interface PurchaserSelectProps {
  value: string;
  onChange: (value: string, purchaser?: Purchaser) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
}

export function PurchaserSelect({
  value,
  onChange,
  placeholder = "Select Purchaser",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
}: PurchaserSelectProps) {
  const fetchData = useCallback(
    async (skip: number, search: string) => {
      return await getPurchasersPage(skip, search, 30);
    },
    [],
  );

  return (
    <GenericLookupModal<Purchaser>
      value={value}
      onChange={onChange}
      fetchData={fetchData}
      title="Select Purchaser"
      placeholder={placeholder}
      icon={<UserCircle className="text-muted-foreground h-4 w-4" />}
      disabled={disabled}
      className={cn(className, hasError && errorClass)}
      hasError={hasError}
      keyExtractor={(item) => item.Code}
      displayValueExtractor={(item) => 
        item.Name ? `${item.Code} - ${item.Name}` : item.Code
      }
      columns={[
        { id: "Code", label: "Code", width: "120px" },
        { id: "Name", label: "Name" },
      ]}
    />
  );
}
