/**
 * Hook for managing production order form data loading
 * Separates data fetching logic from the form component
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getProductionOrderByNo,
  getProductionOrderLines,
  getProductionOrderComponents,
  type ProductionOrder,
  type ProductionOrderLine,
  type ProductionOrderComponent,
} from "@/lib/api/services/production-orders.service";
import { mapSourceType } from "../utils/map-source-type";

export type FormMode = "create" | "view" | "edit";

export interface ProductionOrderFormState {
  No: string;
  Description: string;
  Shortcut_Dimension_1_Code: string;
  Shortcut_Dimension_2_Code: string;
  Shortcut_Dimension_3_Code: string;
  Source_Type: "Item" | "Family" | "Sales Header" | "";
  Source_No: string;
  Quantity: number;
  Due_Date: string;
  Location_Code: string;
  Hatching_Date: string;
  Prod_Bom_No: string;
  BOM_Version_No: string;
  isProdBomFromItem: boolean;
  Batch_Size: "0.8" | "1.0" | "1.5" | "2.0" | "";
}

export const INITIAL_FORM_STATE: ProductionOrderFormState = {
  No: "",
  Description: "",
  Shortcut_Dimension_1_Code: "",
  Shortcut_Dimension_2_Code: "",
  Shortcut_Dimension_3_Code: "",
  Source_Type: "",
  Source_No: "",
  Quantity: 0,
  Due_Date: "",
  Location_Code: "",
  Hatching_Date: "",
  Prod_Bom_No: "",
  BOM_Version_No: "",
  isProdBomFromItem: false,
  Batch_Size: "",
};

interface UseProductionOrderDataOptions {
  orderNo?: string;
  mode: FormMode;
  initialFormData?: Partial<ProductionOrderFormState>;
}

interface UseProductionOrderDataResult {
  // Form state
  formState: ProductionOrderFormState;
  setFormState: React.Dispatch<React.SetStateAction<ProductionOrderFormState>>;

  // Order data
  order: ProductionOrder | null;
  orderLines: ProductionOrderLine[];
  orderComponents: ProductionOrderComponent[];

  // Loading states
  isInitialLoadComplete: boolean;
  isLoadingLines: boolean;
  isLoadingComponents: boolean;

  // Actions
  refreshOrderData: () => Promise<void>;
  loadComponents: (lines: ProductionOrderLine[]) => Promise<void>;

  // Flags
  hasLoadedComponents: boolean;
  setHasLoadedComponents: (value: boolean) => void;
}

/**
 * Converts ProductionOrder to form state
 */
function orderToFormState(
  order: ProductionOrder,
  existingState?: ProductionOrderFormState,
): ProductionOrderFormState {
  return {
    ...(existingState || INITIAL_FORM_STATE),
    No: order.No,
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
    isProdBomFromItem: !!order.Prod_Bom_No,
    Batch_Size:
      (order.Batch_Size as ProductionOrderFormState["Batch_Size"]) || "",
  };
}

export function useProductionOrderData(
  options: UseProductionOrderDataOptions,
): UseProductionOrderDataResult {
  const { orderNo, mode, initialFormData } = options;

  // Form state
  const [formState, setFormState] = useState<ProductionOrderFormState>({
    ...INITIAL_FORM_STATE,
    ...initialFormData,
  });

  // Order data
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [orderLines, setOrderLines] = useState<ProductionOrderLine[]>([]);
  const [orderComponents, setOrderComponents] = useState<
    ProductionOrderComponent[]
  >([]);

  // Loading states
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isLoadingComponents, setIsLoadingComponents] = useState(false);
  const [hasLoadedComponents, setHasLoadedComponents] = useState(false);

  // Load components for all lines
  const loadComponents = useCallback(
    async (lines: ProductionOrderLine[]) => {
      if (!orderNo || lines.length === 0) return;

      setIsLoadingComponents(true);
      try {
        const allComponents: ProductionOrderComponent[] = [];
        for (const line of lines) {
          if (line.Line_No) {
            const lineComponents = await getProductionOrderComponents(
              orderNo,
              line.Line_No,
            );
            allComponents.push(...lineComponents);
          }
        }
        setOrderComponents(allComponents);
        setHasLoadedComponents(true);
      } catch (error) {
        console.error("Error loading components:", error);
        toast.error("Failed to load components");
      } finally {
        setIsLoadingComponents(false);
      }
    },
    [orderNo],
  );

  // Refresh order data
  const refreshOrderData = useCallback(async () => {
    if (!orderNo) return;

    try {
      // Fetch order
      const fetchedOrder = await getProductionOrderByNo(orderNo);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
        setFormState((prev) => orderToFormState(fetchedOrder, prev));
      }

      // Fetch lines
      const lines = await getProductionOrderLines(orderNo);
      setOrderLines(lines);

      // Refresh components if they were previously loaded
      if (hasLoadedComponents) {
        await loadComponents(lines);
      }
    } catch (error) {
      console.error("Error refreshing order data:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh order",
      );
    }
  }, [orderNo, hasLoadedComponents, loadComponents]);

  // Initial load
  useEffect(() => {
    if (!orderNo || mode === "create") {
      setIsInitialLoadComplete(true);
      return;
    }

    const loadOrderData = async () => {
      try {
        // Fetch order
        const fetchedOrder = await getProductionOrderByNo(orderNo);
        if (fetchedOrder) {
          setOrder(fetchedOrder);
          setFormState((prev) => orderToFormState(fetchedOrder, prev));
        }

        // Load order lines
        setIsLoadingLines(true);
        const lines = await getProductionOrderLines(orderNo);
        setOrderLines(lines);
        setIsLoadingLines(false);

        setIsInitialLoadComplete(true);
      } catch (error) {
        console.error("Error loading order data:", error);
        setIsInitialLoadComplete(true);
      }
    };

    loadOrderData();
  }, [orderNo, mode]);

  return {
    formState,
    setFormState,
    order,
    orderLines,
    orderComponents,
    isInitialLoadComplete,
    isLoadingLines,
    isLoadingComponents,
    refreshOrderData,
    loadComponents,
    hasLoadedComponents,
    setHasLoadedComponents,
  };
}
