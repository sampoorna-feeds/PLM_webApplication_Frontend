"use client";

import { useState, useEffect, useCallback } from "react";
import { PostedTransferFilterForm, type PostedTransferFilters } from "./posted-transfer-filter-form";
import { PostedTransferTable } from "./posted-transfer-table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, RefreshCcw } from "lucide-react";
import { getPostedTransferShipments, getTransferReceipts } from "@/lib/api/services/transfer-orders.service";
import { toast } from "sonner";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";

interface PostedTransferViewProps {
  type: "shipment" | "receipt";
}

export function PostedTransferView({ type }: PostedTransferViewProps) {
  const { openTab } = useFormStackContext();
  const [filters, setFilters] = useState<PostedTransferFilters | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const title = type === "shipment" ? "Posted Transfer Shipment" : "Posted Transfer Receipt";
  const description = `Enter details to find posted transfer ${type}s.`;

  const fetchData = useCallback(async (appliedFilters: PostedTransferFilters) => {
    setIsLoading(true);
    try {
      const parts = [];
      if (appliedFilters.postingDate) {
        parts.push(`Posting_Date eq ${appliedFilters.postingDate}`);
      }
      if (appliedFilters.fromLocation) {
        parts.push(`Transfer_from_Code eq '${appliedFilters.fromLocation}'`);
      }
      if (appliedFilters.toLocation) {
        parts.push(`Transfer_to_Code eq '${appliedFilters.toLocation}'`);
      }
      
      const filter = parts.join(" and ");
      const result = type === "shipment" 
        ? await getPostedTransferShipments({ $filter: filter, $top: 200 })
        : await getTransferReceipts({ $filter: filter, $top: 200 });
      
      setData(result.orders);
    } catch (error) {
      console.error(`Error fetching posted transfer ${type}s:`, error);
      toast.error(`Failed to load posted ${type}s.`);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (filters) {
      fetchData(filters);
    }
  }, [filters, fetchData]);

  if (!filters) {
    return (
      <PostedTransferFilterForm
        onApply={(f) => setFilters(f)}
        title={title}
        description={description}
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full gap-2">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold">{title} Data</h1>
          <p className="text-muted-foreground text-xs">
            Date: {filters.postingDate}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(filters)} disabled={isLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setFilters(null); setData([]); }}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden px-4 pb-4">
        <PostedTransferTable 
          data={data} 
          isLoading={isLoading} 
          onRowClick={(id) => {
             // Open detailed view tab if needed
             // For now, just a toast as details are not implemented
             toast.info(`${type} ${id} selected. Detailed view coming soon.`);
          }}
        />
      </div>
    </div>
  );
}
