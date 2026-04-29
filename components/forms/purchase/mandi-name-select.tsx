"use client";

import { useCallback } from "react";
import { MapPin } from "lucide-react";
import { GenericLookupModal } from "../shared/generic-lookup-modal";
import { purchaseDropdownsService, MandiMaster } from "@/lib/api/services/purchase-dropdowns.service";

interface MandiNameSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

export function MandiNameSelect({
  value,
  onChange,
  disabled,
  className,
  hasError,
}: MandiNameSelectProps) {
  const fetchData = useCallback(async (skip: number, search: string) => {
    return await purchaseDropdownsService.getMandiMastersPage(skip, search, 30);
  }, []);

  return (
    <GenericLookupModal<MandiMaster>
      value={value}
      onChange={onChange}
      fetchData={fetchData}
      title="Select Mandi Name"
      placeholder="Select mandi"
      icon={<MapPin className="text-muted-foreground h-4 w-4" />}
      disabled={disabled}
      className={className}
      hasError={hasError}
      keyExtractor={(item) => item.Code}
      displayValueExtractor={(item) => `${item.Code} - ${item.Description}`}
      columns={[
        { id: "Code", label: "Code", width: "150px" },
        { id: "Description", label: "Description" },
      ]}
    />
  );
}
