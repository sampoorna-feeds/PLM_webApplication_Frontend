"use client";

import { useCallback } from "react";
import { Package } from "lucide-react";
import { GenericLookupModal } from "../shared/generic-lookup-modal";
import { getItemsPage, type Item } from "@/lib/api/services/item.service";

interface ItemSelectProps {
  value: string;
  onChange: (value: string, item?: Item) => void;
  locationCode?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

export function ItemSelect({
  value,
  onChange,
  locationCode,
  disabled,
  className,
  hasError,
}: ItemSelectProps) {
  const fetchData = useCallback(
    async (skip: number, search: string) => {
      return await getItemsPage(skip, search, 30, locationCode);
    },
    [locationCode],
  );

  return (
    <GenericLookupModal<Item>
      value={value}
      onChange={onChange}
      fetchData={fetchData}
      title="Select Item"
      placeholder="Select Item"
      icon={<Package className="text-muted-foreground h-4 w-4" />}
      disabled={disabled}
      className={className}
      hasError={hasError}
      keyExtractor={(item) => item.No}
      displayValueExtractor={(item) => `${item.No} - ${item.Description}`}
      columns={[
        { id: "No", label: "Item No.", width: "150px" },
        { id: "Description", label: "Description" },
        { id: "Purch_Unit_of_Measure", label: "Purch UOM", width: "120px" },
      ]}
    />
  );
}
