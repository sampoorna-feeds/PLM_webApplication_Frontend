"use client";

import { useCallback } from "react";
import { CreditCard } from "lucide-react";
import { GenericLookupModal } from "../shared/generic-lookup-modal";
import { purchaseDropdownsService, PaymentTerm } from "@/lib/api/services/purchase-dropdowns.service";

interface PaymentTermSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

export function PaymentTermSelect({
  value,
  onChange,
  disabled,
  className,
  hasError,
}: PaymentTermSelectProps) {
  const fetchData = useCallback(async (skip: number, search: string) => {
    return await purchaseDropdownsService.getPaymentTermsPage(skip, search, 30);
  }, []);

  return (
    <GenericLookupModal<PaymentTerm>
      value={value}
      onChange={onChange}
      fetchData={fetchData}
      title="Select Payment Term"
      placeholder="Select pmt term"
      icon={<CreditCard className="text-muted-foreground h-4 w-4" />}
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
