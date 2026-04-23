"use client";

import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWorkOrder } from "@/lib/api/services/production-orders.service";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "./api-error-dialog";

interface ProductionOrderWorkOrderDialogProps {
  prodOrderNo: string;
}

export function ProductionOrderWorkOrderDialog({
  prodOrderNo,
}: ProductionOrderWorkOrderDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiErrorState | null>(null);

  const handleWorkOrderClick = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getWorkOrder(prodOrderNo);

      if (response && response.value) {
        // Convert base64 to Blob
        const base64Data = response.value;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        // Create blob URL and open in new tab
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        
        // Note: URL.revokeObjectURL(blobUrl) is intentionally omitted here 
        // to ensure the new tab has time to load the PDF.
      } else {
        throw new Error("Invalid response format: missing PDF data.");
      }
    } catch (err) {
      console.error("Error loading Work Order:", err);
      setError({
        title: "Work Order Error",
        ...extractApiError(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={handleWorkOrderClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ClipboardList className="mr-2 h-4 w-4" />
        )}
        Work Order
      </Button>

      <ApiErrorDialog
        error={error}
        onClose={() => setError(null)}
      />
    </>
  );
}
