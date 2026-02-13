"use client";

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
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";

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

function SalesReturnOrderPageContent() {
  const { openTab } = useFormStackContext();

  const handleCreateReturnOrder = () => {
    openTab("sales-return-order", {
      title: "Create Sales Return Order",
      context: { openedFromParent: true },
      autoCloseOnSuccess: true,
    });
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-col px-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Sales Return Order
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage sales return orders
              </p>
            </div>
            <Button onClick={handleCreateReturnOrder} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Return Order
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4">
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
        </div>
      </div>

      <FormStackPanel />
      <MiniAccessPanel />
    </div>
  );
}

export default function SalesReturnOrderPage() {
  return (
    <FormStackProvider formScope="sales">
      <SalesReturnOrderPageContent />
    </FormStackProvider>
  );
}
