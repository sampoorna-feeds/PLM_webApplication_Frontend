"use client";

/**
 * Sales Form component
 * Tabbed view with tables for Sales Order, Sales Invoice, Sales Return Order, and Sales Credit Memo
 * Uses FormStack for Invoice/Return/Credit Memo; Place Order navigates to full page.
 */

import React, { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import {
  SalesOrdersTable,
  SalesOrderFilterBar,
  SalesOrderActiveFilters,
  SalesOrderPaginationControls,
  useSalesOrders,
} from "@/components/forms/sales-orders";

// Dummy data for Sales Invoice
const dummySalesInvoiceData = [
  {
    id: 1,
    invoiceNo: "SI-001",
    customerNo: "CUST001",
    customerName: "ABC Corporation",
    invoiceDate: "2026-01-15",
    postingDate: "2026-01-15",
    documentDate: "2026-01-15",
    externalDocumentNo: "EXT001",
    status: "Posted",
    amount: 50000,
  },
  {
    id: 2,
    invoiceNo: "SI-002",
    customerNo: "CUST002",
    customerName: "XYZ Industries",
    invoiceDate: "2026-01-16",
    postingDate: "2026-01-16",
    documentDate: "2026-01-16",
    externalDocumentNo: "EXT002",
    status: "Posted",
    amount: 75000,
  },
  {
    id: 3,
    invoiceNo: "SI-003",
    customerNo: "CUST003",
    customerName: "Global Trading Co.",
    invoiceDate: "2026-01-17",
    postingDate: "2026-01-17",
    documentDate: "2026-01-17",
    externalDocumentNo: "EXT003",
    status: "Pending",
    amount: 30000,
  },
];

// Dummy data for Sales Return Order
const dummySalesReturnOrderData = [
  {
    id: 1,
    returnOrderNo: "SRO-001",
    customerNo: "CUST001",
    customerName: "ABC Corporation",
    returnDate: "2026-01-15",
    postingDate: "2026-01-15",
    documentDate: "2026-01-15",
    externalDocumentNo: "EXT001",
    status: "Pending",
    amount: 5000,
  },
  {
    id: 2,
    returnOrderNo: "SRO-002",
    customerNo: "CUST002",
    customerName: "XYZ Industries",
    returnDate: "2026-01-16",
    postingDate: "2026-01-16",
    documentDate: "2026-01-16",
    externalDocumentNo: "EXT002",
    status: "Approved",
    amount: 7500,
  },
  {
    id: 3,
    returnOrderNo: "SRO-003",
    customerNo: "CUST003",
    customerName: "Global Trading Co.",
    returnDate: "2026-01-17",
    postingDate: "2026-01-17",
    documentDate: "2026-01-17",
    externalDocumentNo: "EXT003",
    status: "Completed",
    amount: 3000,
  },
];

// Dummy data for Sales Credit Memo
const dummySalesCreditMemoData = [
  {
    id: 1,
    creditMemoNo: "SCM-001",
    customerNo: "CUST001",
    customerName: "ABC Corporation",
    creditMemoDate: "2026-01-15",
    postingDate: "2026-01-15",
    documentDate: "2026-01-15",
    externalDocumentNo: "EXT001",
    status: "Posted",
    amount: 5000,
  },
  {
    id: 2,
    creditMemoNo: "SCM-002",
    customerNo: "CUST002",
    customerName: "XYZ Industries",
    creditMemoDate: "2026-01-16",
    postingDate: "2026-01-16",
    documentDate: "2026-01-16",
    externalDocumentNo: "EXT002",
    status: "Posted",
    amount: 7500,
  },
  {
    id: 3,
    creditMemoNo: "SCM-003",
    customerNo: "CUST003",
    customerName: "Global Trading Co.",
    creditMemoDate: "2026-01-17",
    postingDate: "2026-01-17",
    documentDate: "2026-01-17",
    externalDocumentNo: "EXT003",
    status: "Pending",
    amount: 3000,
  },
];

type SalesType = "order" | "invoice" | "return-order" | "credit-memo";

function SalesOrderTabContent({
  registerRefetch,
}: {
  registerRefetch?: (refetch: () => void) => void;
}) {
  const { openTab } = useFormStackContext();
  const {
    orders,
    isLoading,
    refetch,
    pageSize,
    currentPage,
    totalPages,
    totalCount,
    sortColumn,
    sortDirection,
    searchQuery,
    columnFilters,
    visibleColumns,
    onPageSizeChange,
    onPageChange,
    onSort,
    onSearch,
    onColumnFilter,
    onColumnToggle,
    onResetColumns,
    onShowAllColumns,
    onClearFilters,
  } = useSalesOrders();

  useEffect(() => {
    registerRefetch?.(refetch);
  }, [refetch, registerRefetch]);

  const hasNextPage = currentPage < totalPages;

  return (
    <div className="flex flex-col gap-3">
      <SalesOrderFilterBar
        searchQuery={searchQuery}
        visibleColumns={visibleColumns}
        columnFilters={columnFilters}
        onSearch={onSearch}
        onClearFilters={onClearFilters}
        onColumnToggle={onColumnToggle}
        onResetColumns={onResetColumns}
        onShowAllColumns={onShowAllColumns}
      />
      <SalesOrderActiveFilters
        searchQuery={searchQuery}
        columnFilters={columnFilters}
        onSearch={onSearch}
        onColumnFilter={onColumnFilter}
        onClearFilters={onClearFilters}
      />
      <div className="min-h-[300px] flex-1">
        <SalesOrdersTable
          orders={orders}
          isLoading={isLoading}
          visibleColumns={visibleColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          pageSize={pageSize}
          currentPage={currentPage}
          columnFilters={columnFilters}
          onRowClick={(orderNo) => {
            openTab("sales-order-detail", {
              title: `Order ${orderNo}`,
              context: { orderNo },
              autoCloseOnSuccess: false,
            });
          }}
          onSort={onSort}
          onColumnFilter={onColumnFilter}
        />
      </div>
      <SalesOrderPaginationControls
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        onPageSizeChange={onPageSizeChange}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function SalesFormContent() {
  const [activeTab, setActiveTab] = useState<SalesType>("order");
  const { openTab } = useFormStackContext();
  const salesOrderRefetchRef = useRef<(() => void) | null>(null);

  const getButtonLabel = (type: SalesType) => {
    switch (type) {
      case "order":
        return "Place Order";
      case "invoice":
        return "Create Invoice";
      case "return-order":
        return "Create Return Order";
      case "credit-memo":
        return "Create Credit Memo";
      default:
        return "Create";
    }
  };

  const handleOpenForm = (type: SalesType) => {
    const formTypeMap: Record<SalesType, string> = {
      order: "sales-order",
      invoice: "sales-invoice",
      "return-order": "sales-return-order",
      "credit-memo": "sales-credit-memo",
    };

    const titleMap: Record<SalesType, string> = {
      order: "New Order",
      invoice: "Create Sales Invoice",
      "return-order": "Create Sales Return Order",
      "credit-memo": "Create Sales Credit Memo",
    };

    openTab(formTypeMap[type], {
      title: titleMap[type],
      context: {
        openedFromParent: true,
        onOrderPlaced:
          type === "order"
            ? () => salesOrderRefetchRef.current?.()
            : undefined,
      },
      autoCloseOnSuccess: true,
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as SalesType)}
        >
          <div className="flex flex-col gap-4">
            <TabsList className="w-full">
              <TabsTrigger value="order" className="flex-1">
                Sales Order
              </TabsTrigger>
              <TabsTrigger value="invoice" className="flex-1">
                Sales Invoice
              </TabsTrigger>
              <TabsTrigger value="return-order" className="flex-1">
                Sales Return Order
              </TabsTrigger>
              <TabsTrigger value="credit-memo" className="flex-1">
                Sales Credit Memo
              </TabsTrigger>
            </TabsList>
            <div className="flex justify-end">
              <Button onClick={() => handleOpenForm(activeTab)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {getButtonLabel(activeTab)}
              </Button>
            </div>
          </div>

          {/* Sales Order Tab */}
          <TabsContent value="order" className="mt-4">
            <SalesOrderTabContent
              registerRefetch={(fn) => {
                salesOrderRefetchRef.current = fn;
              }}
            />
          </TabsContent>

          {/* Sales Invoice Tab */}
          <TabsContent value="invoice" className="mt-4">
            <div className="bg-card overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Invoice No.
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Customer No.
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Customer Name
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Invoice Date
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Posting Date
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Document Date
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        External Doc No.
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Status
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dummySalesInvoiceData.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-muted/50">
                        <TableCell className="px-3 py-3 text-xs">
                          {invoice.invoiceNo}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {invoice.customerNo}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {invoice.customerName}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {invoice.invoiceDate}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {invoice.postingDate}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {invoice.documentDate}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {invoice.externalDocumentNo}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {invoice.status}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {invoice.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Sales Return Order Tab */}
          <TabsContent value="return-order" className="mt-4">
            <div className="bg-card overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Return Order No.
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Customer No.
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Customer Name
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Return Date
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Posting Date
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Document Date
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        External Doc No.
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Status
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dummySalesReturnOrderData.map((returnOrder) => (
                      <TableRow
                        key={returnOrder.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="px-3 py-3 text-xs">
                          {returnOrder.returnOrderNo}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {returnOrder.customerNo}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {returnOrder.customerName}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {returnOrder.returnDate}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {returnOrder.postingDate}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {returnOrder.documentDate}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {returnOrder.externalDocumentNo}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {returnOrder.status}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {returnOrder.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Sales Credit Memo Tab */}
          <TabsContent value="credit-memo" className="mt-4">
            <div className="bg-card overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Credit Memo No.
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Customer No.
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Customer Name
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Credit Memo Date
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Posting Date
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Document Date
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        External Doc No.
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Status
                      </TableHead>
                      <TableHead className="px-3 py-3 text-xs font-medium">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dummySalesCreditMemoData.map((creditMemo) => (
                      <TableRow
                        key={creditMemo.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="px-3 py-3 text-xs">
                          {creditMemo.creditMemoNo}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {creditMemo.customerNo}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {creditMemo.customerName}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {creditMemo.creditMemoDate}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {creditMemo.postingDate}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {creditMemo.documentDate}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {creditMemo.externalDocumentNo}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {creditMemo.status}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs">
                          {creditMemo.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* FormStack Panel - Part of document flow */}
      <FormStackPanel />

      {/* Mini Access Panel */}
      <MiniAccessPanel />
    </div>
  );
}

export function SalesForm() {
  return (
    <FormStackProvider formScope="sales">
      <SalesFormContent />
    </FormStackProvider>
  );
}
