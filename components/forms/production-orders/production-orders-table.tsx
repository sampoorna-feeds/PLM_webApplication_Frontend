"use client";

import { LoaderCircleIcon } from "lucide-react";
import type { ProductionOrder } from "@/lib/api/services/production-orders.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductionOrdersTableProps {
  orders: ProductionOrder[];
  isLoading: boolean;
  onRowClick: (orderNo: string) => void;
}

export function ProductionOrdersTable({
  orders,
  isLoading,
  onRowClick,
}: ProductionOrdersTableProps) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (orders.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="px-3 py-3 text-xs font-bold">No</TableHead>
              <TableHead className="px-3 py-3 text-xs font-bold">
                Description
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-bold">
                Source No
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-bold">
                Quantity
              </TableHead>
              <TableHead className="px-3 py-3 text-xs font-bold">
                Location Code
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <ProductionOrderRow
                key={order.No}
                order={order}
                onClick={() => onRowClick(order.No)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface ProductionOrderRowProps {
  order: ProductionOrder;
  onClick: () => void;
}

function ProductionOrderRow({ order, onClick }: ProductionOrderRowProps) {
  return (
    <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={onClick}>
      <TableCell className="px-3 py-3 text-xs">{order.No || "-"}</TableCell>
      <TableCell className="px-3 py-3 text-xs">
        {order.Description || "-"}
      </TableCell>
      <TableCell className="px-3 py-3 text-xs">
        {order.Source_No || "-"}
      </TableCell>
      <TableCell className="px-3 py-3 text-xs">
        {order.Quantity ?? "-"}
      </TableCell>
      <TableCell className="px-3 py-3 text-xs">
        {order.Location_Code || "-"}
      </TableCell>
    </TableRow>
  );
}

function LoadingState() {
  return (
    <div className="w-full flex justify-center items-center flex-col h-64 gap-4">
      <LoaderCircleIcon className="animate-spin size-14" />
      <span className="text-xl font-bold">Loading...</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <p className="text-muted-foreground">No production orders found</p>
    </div>
  );
}
