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

function getFormattedLocalDateTime(date: Date = new Date()): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;
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

      const puserID = "Jobqueue";
      const printDateTime = getFormattedLocalDateTime();

      const response = await getWorkOrder(
        prodOrderNo,
        puserID,
        printDateTime,
      );

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
        data-work-order-trigger
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
