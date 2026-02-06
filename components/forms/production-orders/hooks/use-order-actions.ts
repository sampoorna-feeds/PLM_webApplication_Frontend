/**
 * useOrderActions Hook
 * Encapsulates production order action logic (refresh, manufacture, submit)
 * following Single Responsibility Principle
 */

"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  refreshProductionOrder,
  changeProductionOrderStatus,
  createProductionOrder,
  getProductionOrderByNo,
  getProductionOrderLines,
  getProductionOrderComponents,
  type ProductionOrderLine,
  type ProductionOrderComponent,
} from "@/lib/api/services/production-orders.service";
import { mapSourceType } from "../utils/map-source-type";

export interface OrderFormState {
  No: string;
  Description: string;
  Shortcut_Dimension_1_Code: string;
  Shortcut_Dimension_2_Code: string;
  Shortcut_Dimension_3_Code: string;
  Source_Type: string;
  Source_No: string;
  Quantity: number;
  Due_Date: string;
  Location_Code: string;
  Hatching_Date: string;
  Prod_Bom_No: string;
  BOM_Version_No: string;
  isProdBomFromItem: boolean;
  Batch_Size: string;
}

interface UseOrderActionsParams {
  formState: OrderFormState;
  setFormState: React.Dispatch<React.SetStateAction<OrderFormState>>;
  setOrderLines: React.Dispatch<React.SetStateAction<ProductionOrderLine[]>>;
  setOrderComponents: React.Dispatch<React.SetStateAction<ProductionOrderComponent[]>>;
}

interface UseOrderActionsReturn {
  isRefreshing: boolean;
  isManufacturing: boolean;
  isSubmitting: boolean;
  handleRefresh: () => Promise<void>;
  handleManufacture: () => Promise<void>;
  handleCreate: () => Promise<{ success: boolean; orderNo?: string }>;
}

export function useOrderActions({
  formState,
  setFormState,
  setOrderLines,
  setOrderComponents,
}: UseOrderActionsParams): UseOrderActionsReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isManufacturing, setIsManufacturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refresh production order and reload data
  const handleRefresh = useCallback(async () => {
    if (!formState.No) return;

    setIsRefreshing(true);
    try {
      await refreshProductionOrder(formState.No);
      toast.success("Production Order refreshed successfully!");

      // Reload order data
      const order = await getProductionOrderByNo(formState.No);
      if (order) {
        setFormState((prev) => ({
          ...prev,
          Description: order.Description || "",
          Shortcut_Dimension_1_Code: order.Shortcut_Dimension_1_Code || "",
          Shortcut_Dimension_2_Code: order.Shortcut_Dimension_2_Code || "",
          Shortcut_Dimension_3_Code: order.Shortcut_Dimension_3_Code || "",
          Source_Type: mapSourceType(order.Source_Type),
          Source_No: order.Source_No || "",
          Quantity: order.Quantity || 0,
          Due_Date: order.Due_Date || "",
          Location_Code: order.Location_Code || "",
          Hatching_Date: order.Hatching_Date || "",
          Prod_Bom_No: order.Prod_Bom_No || "",
          BOM_Version_No: order.BOM_Version_No || "",
        }));
      }

      // Refresh lines and components
      const lines = await getProductionOrderLines(formState.No);
      setOrderLines(lines);

      const allComponents: ProductionOrderComponent[] = [];
      for (const line of lines) {
        if (line.Line_No) {
          const lineComponents = await getProductionOrderComponents(
            formState.No,
            line.Line_No
          );
          allComponents.push(...lineComponents);
        }
      }
      setOrderComponents(allComponents);
    } catch (error) {
      console.error("Error refreshing production order:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to refresh production order"
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [formState.No, setFormState, setOrderLines, setOrderComponents]);

  // Change status to Finished
  const handleManufacture = useCallback(async () => {
    if (!formState.No) return;

    const today = new Date().toISOString().split("T")[0];

    setIsManufacturing(true);
    try {
      await changeProductionOrderStatus(formState.No, today);
      toast.success("Production Order status changed to Finished!");

      // Reload order data after status change
      const order = await getProductionOrderByNo(formState.No);
      if (order) {
        setFormState((prev) => ({
          ...prev,
          Description: order.Description || "",
          Shortcut_Dimension_1_Code: order.Shortcut_Dimension_1_Code || "",
          Shortcut_Dimension_2_Code: order.Shortcut_Dimension_2_Code || "",
          Shortcut_Dimension_3_Code: order.Shortcut_Dimension_3_Code || "",
          Source_Type: mapSourceType(order.Source_Type),
          Source_No: order.Source_No || "",
          Quantity: order.Quantity || 0,
          Due_Date: order.Due_Date || "",
          Location_Code: order.Location_Code || "",
          Hatching_Date: order.Hatching_Date || "",
          Prod_Bom_No: order.Prod_Bom_No || "",
          BOM_Version_No: order.BOM_Version_No || "",
        }));
      }

      // Refresh lines and components
      const lines = await getProductionOrderLines(formState.No);
      setOrderLines(lines);

      const allComponents: ProductionOrderComponent[] = [];
      for (const line of lines) {
        if (line.Line_No) {
          const lineComponents = await getProductionOrderComponents(
            formState.No,
            line.Line_No
          );
          allComponents.push(...lineComponents);
        }
      }
      setOrderComponents(allComponents);
    } catch (error) {
      console.error("Error changing production order status:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to change production order status"
      );
    } finally {
      setIsManufacturing(false);
    }
  }, [formState.No, setFormState, setOrderLines, setOrderComponents]);

  // Create new production order
  const handleCreate = useCallback(async (): Promise<{
    success: boolean;
    orderNo?: string;
  }> => {
    setIsSubmitting(true);
    try {
      const payload = {
        Status: "Released" as const,
        Description: formState.Description,
        Source_Type: formState.Source_Type as "Item" | "Family" | "Sales Header",
        Source_No: formState.Source_No,
        Quantity: formState.Quantity,
        Due_Date: formState.Due_Date,
        Location_Code: formState.Location_Code,
        Hatching_Date: formState.Hatching_Date || undefined,
        Shortcut_Dimension_1_Code: formState.Shortcut_Dimension_1_Code,
        Shortcut_Dimension_2_Code: formState.Shortcut_Dimension_2_Code,
        Shortcut_Dimension_3_Code: formState.Shortcut_Dimension_3_Code,
        Prod_Bom_No: formState.Prod_Bom_No || undefined,
        BOM_Version_No:
          !formState.isProdBomFromItem && formState.BOM_Version_No
            ? formState.BOM_Version_No
            : undefined,
        Batch_Size: formState.Batch_Size || undefined,
      };

      const createdOrder = await createProductionOrder(payload);
      toast.success(`Production Order ${createdOrder.No} created successfully!`);

      return { success: true, orderNo: createdOrder.No };
    } catch (error) {
      console.error("Error creating Production Order:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create production order"
      );
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  }, [formState]);

  return {
    isRefreshing,
    isManufacturing,
    isSubmitting,
    handleRefresh,
    handleManufacture,
    handleCreate,
  };
}
