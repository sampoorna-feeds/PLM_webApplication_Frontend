"use client";

import { useCallback } from "react";
import { Users } from "lucide-react";
import { GenericLookupModal } from "../shared/generic-lookup-modal";
import { CREDITOR_TYPE_OPTIONS } from "./purchase-form-options";

interface CreditorTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

interface CreditorTypeItem {
  value: string;
  label: string;
}

export function CreditorTypeSelect({
  value,
  onChange,
  disabled,
  className,
  hasError,
}: CreditorTypeSelectProps) {
  const fetchData = useCallback(async (skip: number, search: string) => {
    // Client-side search and pagination for static data
    const query = search.toLowerCase();
    const filtered = CREDITOR_TYPE_OPTIONS.filter((opt) => 
      opt.value.toLowerCase().includes(query) || opt.label.toLowerCase().includes(query)
    );
    return filtered.slice(skip, skip + 30);
  }, []);

  return (
    <GenericLookupModal<CreditorTypeItem>
      value={value}
      onChange={onChange}
      fetchData={fetchData}
      title="Select Creditor Type"
      placeholder="Select creditor"
      icon={<Users className="text-muted-foreground h-4 w-4" />}
      disabled={disabled}
      className={className}
      hasError={hasError}
      keyExtractor={(item) => item.value}
      displayValueExtractor={(item) => item.label}
      columns={[
        { id: "no", label: "No.", width: "80px", render: (_, idx) => idx + 1 },
        { id: "label", label: "Creditor Type" },
      ]}
    />
  );
}
