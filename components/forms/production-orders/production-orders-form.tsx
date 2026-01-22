"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useProductionOrders,
  useProductionOrderSheet,
} from "./use-production-orders";
import { ProductionOrdersTable } from "./production-orders-table";
import { ProductionOrderSheet } from "./production-order-sheet";
import { PaginationControls } from "./pagination-controls";

export function ProductionOrdersForm() {
  const {
    orders,
    isLoading,
    pageSize,
    currentPage,
    onPageSizeChange,
    onPageChange,
    refetch,
  } = useProductionOrders();

  const {
    selectedOrder,
    isOpen,
    isSaving,
    mode,
    formData,
    setMode,
    setIsOpen,
    openOrderDetail,
    openCreateOrder,
    handleSave,
  } = useProductionOrderSheet();

  // Determine if there's a next page based on current results
  const hasNextPage = orders.length === pageSize;

  return (
    <div className="p-4 w-full h-full flex flex-col">
      <Header onCreateOrder={openCreateOrder} />

      <div className="flex-1">
        <ProductionOrdersTable
          orders={orders}
          isLoading={isLoading}
          onRowClick={openOrderDetail}
        />
      </div>

      <PaginationControls
        pageSize={pageSize}
        currentPage={currentPage}
        hasNextPage={hasNextPage}
        onPageSizeChange={onPageSizeChange}
        onPageChange={onPageChange}
      />

      <ProductionOrderSheet
        order={selectedOrder}
        open={isOpen}
        mode={mode}
        initialFormData={formData}
        isSaving={isSaving}
        onOpenChange={setIsOpen}
        onModeChange={setMode}
        onSave={handleSave}
        onRefresh={refetch}
      />
    </div>
  );
}

interface HeaderProps {
  onCreateOrder: () => void;
}

function Header({ onCreateOrder }: HeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Released Production Orders</h1>
        <p className="text-sm text-muted-foreground">
          View and manage released production orders
        </p>
      </div>
      <Button onClick={onCreateOrder} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Order
      </Button>
    </div>
  );
}
