"use client";

import { useCallback } from "react";
import { FileText } from "lucide-react";
import { GenericLookupModal } from "../shared/generic-lookup-modal";
import { purchaseDropdownsService, TermAndCondition } from "@/lib/api/services/purchase-dropdowns.service";

interface TermCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

export function TermCodeSelect({
  value,
  onChange,
  disabled,
  className,
  hasError,
}: TermCodeSelectProps) {
  const fetchData = useCallback(async (skip: number, search: string) => {
    return await purchaseDropdownsService.getTermsAndConditionsPage(skip, search, 30);
  }, []);

  return (
    <GenericLookupModal<TermAndCondition>
      value={value}
      onChange={onChange}
      fetchData={fetchData}
      title="Select Term Code"
      placeholder="Select term"
      icon={<FileText className="text-muted-foreground h-4 w-4" />}
      disabled={disabled}
      className={className}
      hasError={hasError}
      keyExtractor={(item) => item.Terms}
      displayValueExtractor={(item) => `${item.Terms} - ${item.Conditions}`}
      columns={[
        { id: "Terms", label: "Terms", width: "150px" },
        { id: "Conditions", label: "Conditions" },
      ]}
    />
  );
}
