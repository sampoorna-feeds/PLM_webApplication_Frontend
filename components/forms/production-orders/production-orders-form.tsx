"use client";

/**
 * Production Orders Form
 * Main component for viewing and managing production orders
 * Uses FormStack for managing multiple form tabs
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { useProductionOrders } from "./use-production-orders";
import { useFinishedProductionOrders } from "./use-finished-production-orders";
import { ProductionOrdersTable } from "./production-orders-table";
import { PaginationControls } from "./pagination-controls";
import { TableFilterBar } from "./table-filter-bar";
import { ActiveFilters } from "./active-filters";
import { cn } from "@/lib/utils";

function ProductionOrdersContent() {
  const [activeTab, setActiveTab] = useState("released");
  const { openTab } = useFormStackContext();

  // Released orders hook
  const releasedOrders = useProductionOrders();

  // Finished orders hook
  const finishedOrders = useFinishedProductionOrders();

  // Select current data based on active tab
  const currentData =
    activeTab === "released" ? releasedOrders : finishedOrders;

  const {
    orders,
    isLoading,
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    onPageSizeChange,
    onPageChange,
    sortColumn,
    sortDirection,
    onSort,
    searchQuery,
    onSearch,
    onClearFilters,
    columnFilters,
    onColumnFilter,
    visibleColumns,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    branchOptions,
    userBranchCodes,
  } = currentData;

  // Determine if there's a next page
  const hasNextPage = currentPage < totalPages;

  // Open create form in FormStack (only for released orders)
  const handleCreateOrder = () => {
    openTab("production-order", {
      title: "Create Production Order",
      context: {
        mode: "create",
        openedFromParent: true,
        onOrderCreated: releasedOrders.addOrder,
      },
      autoCloseOnSuccess: true,
    });
  };

  // Open view form in FormStack when clicking a row
  const handleRowClick = (orderNo: string) => {
    openTab("production-order", {
      title: `Order: ${orderNo}`,
      context: {
        mode: "view",
        orderNo,
        openedFromParent: true,
        onStatusChanged: currentData.refetch,
      },
      autoCloseOnSuccess: false,
    });
  };

  return (
    <div
      className={cn(
        "flex w-full",
        "h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)]",
      )}
    >
      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
        {/* Header - fixed at top */}
        <div className="flex shrink-0 items-center justify-between pb-3">
          <div>
            <h1 className="text-lg font-bold">Production Orders</h1>
            <p className="text-muted-foreground text-sm">
              View and manage production orders
            </p>
          </div>
          {activeTab === "released" && (
            <Button onClick={handleCreateOrder} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Order
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="shrink-0"
        >
          <TabsList>
            <TabsTrigger value="released">Released</TabsTrigger>
            <TabsTrigger value="finished">Finished</TabsTrigger>
          </TabsList>

          <TabsContent value="released" className="mt-0 space-y-3">
            {/* Filter Bar */}
            <div className="shrink-0">
              <TableFilterBar
                searchQuery={searchQuery}
                visibleColumns={visibleColumns}
                columnFilters={columnFilters}
                onSearch={onSearch}
                onClearFilters={onClearFilters}
                onColumnToggle={onColumnToggle}
                onResetColumns={onResetColumns}
                onShowAllColumns={onShowAllColumns}
              />
            </div>

            {/* Active Filters Display */}
            <ActiveFilters
              searchQuery={searchQuery}
              columnFilters={columnFilters}
              onSearch={onSearch}
              onColumnFilter={onColumnFilter}
              onClearFilters={onClearFilters}
              userBranchCodes={userBranchCodes}
            />

            {/* Table container */}
            <div className="min-h-0 flex-1">
              <ProductionOrdersTable
                orders={orders}
                isLoading={isLoading}
                pageSize={pageSize}
                currentPage={currentPage}
                visibleColumns={visibleColumns}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                columnFilters={columnFilters}
                onRowClick={handleRowClick}
                onSort={onSort}
                onColumnFilter={onColumnFilter}
                branchOptions={branchOptions}
              />
            </div>

            {/* Pagination Controls */}
            <div className="shrink-0">
              <PaginationControls
                pageSize={pageSize}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                hasNextPage={hasNextPage}
                onPageSizeChange={onPageSizeChange}
                onPageChange={onPageChange}
              />
            </div>
          </TabsContent>

          <TabsContent value="finished" className="mt-0 space-y-3">
            {/* Filter Bar */}
            <div className="shrink-0">
              <TableFilterBar
                searchQuery={searchQuery}
                visibleColumns={visibleColumns}
                columnFilters={columnFilters}
                onSearch={onSearch}
                onClearFilters={onClearFilters}
                onColumnToggle={onColumnToggle}
                onResetColumns={onResetColumns}
                onShowAllColumns={onShowAllColumns}
              />
            </div>

            {/* Active Filters Display */}
            <ActiveFilters
              searchQuery={searchQuery}
              columnFilters={columnFilters}
              onSearch={onSearch}
              onColumnFilter={onColumnFilter}
              onClearFilters={onClearFilters}
              userBranchCodes={userBranchCodes}
            />

            {/* Table container */}
            <div className="min-h-0 flex-1">
              <ProductionOrdersTable
                orders={orders}
                isLoading={isLoading}
                pageSize={pageSize}
                currentPage={currentPage}
                visibleColumns={visibleColumns}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                columnFilters={columnFilters}
                onRowClick={handleRowClick}
                onSort={onSort}
                onColumnFilter={onColumnFilter}
                branchOptions={branchOptions}
              />
            </div>

            {/* Pagination Controls */}
            <div className="shrink-0">
              <PaginationControls
                pageSize={pageSize}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                hasNextPage={hasNextPage}
                onPageSizeChange={onPageSizeChange}
                onPageChange={onPageChange}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* FormStack Panel */}
      <FormStackPanel />

      {/* Mini Access Panel */}
      <MiniAccessPanel />
    </div>
  );
}

export function ProductionOrdersForm() {
  return (
    <FormStackProvider formScope="production-orders">
      <ProductionOrdersContent />
    </FormStackProvider>
  );
}
