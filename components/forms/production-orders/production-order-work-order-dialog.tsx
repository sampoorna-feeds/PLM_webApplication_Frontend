"use client";

import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getWorkOrder } from "@/lib/api/services/production-orders.service";
import { toast } from "sonner";

interface ProductionOrderWorkOrderDialogProps {
  prodOrderNo: string;
}

export function ProductionOrderWorkOrderDialog({
  prodOrderNo,
}: ProductionOrderWorkOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !data) {
      loadWorkOrder();
    }
  };

  const loadWorkOrder = async () => {
    try {
      setIsLoading(true);
      const response = await getWorkOrder(prodOrderNo);
      setData(response);
    } catch (error) {
      console.error("Error loading Work Order:", error);
      toast.error("Error loading Work Order");
      setData({ error: "Failed to load work order data." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" data-work-order-trigger>
          <ClipboardList className="mr-2 h-4 w-4" />
          Work Order
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[80vh] max-w-[95vw] flex-col p-4 sm:max-w-[85vw] sm:p-6 md:max-w-4xl md:p-8">
        <DialogHeader>
          <DialogTitle>Work Order Response</DialogTitle>
          <DialogDescription>Raw API Response for Production Order {prodOrderNo}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted relative w-full flex-1 overflow-auto rounded-md p-4">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : (
            <pre className="text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
