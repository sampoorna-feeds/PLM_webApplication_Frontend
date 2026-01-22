"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { getLOBsFromUserSetup } from "@/lib/api/services/dimension.service";
import {
  getProductionOrders,
  getProductionOrderByNo,
  getProductionOrderLines,
  getProductionOrderComponents,
  ProductionOrder,
  ProductionOrderLine,
  ProductionOrderComponent,
} from "@/lib/api/services/production-orders.service";
import type { PageSize, SheetMode, ProductionOrderFormData } from "./types";
import { EMPTY_FORM_DATA } from "./types";

const DEFAULT_LOB_CODES = ["CATTLE", "CBF", "FEED"];

export function useProductionOrders() {
  const { userID } = useAuth();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [lobCodes, setLobCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch LOB codes from user setup
  useEffect(() => {
    if (!userID) return;

    const fetchLOBCodes = async () => {
      try {
        const lobs = await getLOBsFromUserSetup(userID);
        const codes = lobs.map((lob) => lob.Code);
        setLobCodes(codes.length > 0 ? codes : DEFAULT_LOB_CODES);
      } catch (error) {
        console.error("Error fetching LOB codes:", error);
        setLobCodes(DEFAULT_LOB_CODES);
      }
    };

    fetchLOBCodes();
  }, [userID]);

  // Fetch production orders when LOB codes or pagination changes
  const fetchOrders = useCallback(async () => {
    if (lobCodes.length === 0) return;

    setIsLoading(true);
    try {
      const lobFilter = lobCodes.map((c) => `'${c}'`).join(",");
      const data = await getProductionOrders({
        $filter: `Status eq 'Released' and Shortcut_Dimension_1_Code in (${lobFilter})`,
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
      });
      setOrders(data);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [lobCodes, pageSize, currentPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handlePageSizeChange = (size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return {
    orders,
    isLoading,
    pageSize,
    currentPage,
    lobCodes,
    onPageSizeChange: handlePageSizeChange,
    onPageChange: handlePageChange,
    refetch: fetchOrders,
  };
}

export function useProductionOrderSheet() {
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<SheetMode>("view");

  // Open sheet to view/edit existing order
  const openOrderDetail = async (orderNo: string) => {
    setIsLoading(true);
    try {
      const order = await getProductionOrderByNo(orderNo);
      if (order) {
        setSelectedOrder(order);
        setMode("view");
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Open sheet to create new order
  const openCreateOrder = () => {
    setSelectedOrder(null);
    setMode("create");
    setIsOpen(true);
  };

  // Close sheet and reset state
  const closeSheet = () => {
    setIsOpen(false);
    setSelectedOrder(null);
    setMode("view");
  };

  // Handle save (create or update)
  const handleSave = async (data: ProductionOrderFormData): Promise<void> => {
    setIsSaving(true);
    try {
      if (mode === "create") {
        // TODO: Call create API when available
        console.log("Creating new order:", data);
        // await createProductionOrder(data);
      } else if (mode === "edit") {
        // TODO: Call update API when available
        console.log("Updating order:", data);
        // await updateProductionOrder(data);
      }
      closeSheet();
    } catch (error) {
      console.error("Error saving order:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Convert ProductionOrder to form data
  const getFormData = (): ProductionOrderFormData => {
    if (!selectedOrder) return EMPTY_FORM_DATA;

    return {
      No: selectedOrder.No,
      Description: selectedOrder.Description || "",
      Description_2: selectedOrder.Description_2 || "",
      Source_Type: selectedOrder.Source_Type || "",
      Source_No: selectedOrder.Source_No || "",
      Quantity: selectedOrder.Quantity || 0,
      Location_Code: selectedOrder.Location_Code || "",
      Due_Date: selectedOrder.Due_Date || "",
      Starting_Date: selectedOrder.Starting_Date || "",
      Ending_Date: selectedOrder.Ending_Date || "",
      Supervisor_Name: selectedOrder.Supervisor_Name || "",
      Breed_Code: selectedOrder.Breed_Code || "",
      Hatchery_Name: selectedOrder.Hatchery_Name || "",
      Shortcut_Dimension_1_Code: selectedOrder.Shortcut_Dimension_1_Code || "",
      Shortcut_Dimension_2_Code: selectedOrder.Shortcut_Dimension_2_Code || "",
      Shortcut_Dimension_3_Code: selectedOrder.Shortcut_Dimension_3_Code || "",
      Assigned_User_ID: selectedOrder.Assigned_User_ID || "",
    };
  };

  return {
    selectedOrder,
    isOpen,
    isLoading,
    isSaving,
    mode,
    formData: getFormData(),
    setMode,
    setIsOpen,
    openOrderDetail,
    openCreateOrder,
    closeSheet,
    handleSave,
  };
}

/**
 * Hook for fetching production order lines
 */
export function useProductionOrderLines(orderNo: string | null) {
  const [lines, setLines] = useState<ProductionOrderLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!orderNo) {
      setLines([]);
      return;
    }

    const fetchLines = async () => {
      setIsLoading(true);
      try {
        const data = await getProductionOrderLines(orderNo);
        setLines(data);
      } catch (error) {
        console.error("Error fetching order lines:", error);
        setLines([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLines();
  }, [orderNo]);

  return {
    lines,
    isLoading,
  };
}

/**
 * Hook for fetching production order components
 */
export function useProductionOrderComponents(orderNo: string | null) {
  const [components, setComponents] = useState<ProductionOrderComponent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!orderNo) {
      setComponents([]);
      return;
    }

    const fetchComponents = async () => {
      setIsLoading(true);
      try {
        const data = await getProductionOrderComponents(orderNo);
        setComponents(data);
      } catch (error) {
        console.error("Error fetching order components:", error);
        setComponents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComponents();
  }, [orderNo]);

  return {
    components,
    isLoading,
  };
}
