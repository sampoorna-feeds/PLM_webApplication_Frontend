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

function SalesInvoicePageContent() {
  const { openTab } = useFormStackContext();

  const handleCreateInvoice = () => {
    openTab("sales-invoice", {
      title: "Create Sales Invoice",
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
                Sales Invoice
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage sales invoices
              </p>
            </div>
            <Button onClick={handleCreateInvoice} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
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
        </div>
      </div>

      <FormStackPanel />
      <MiniAccessPanel />
    </div>
  );
}

export default function SalesInvoicePage() {
  return (
    <FormStackProvider formScope="sales">
      <SalesInvoicePageContent />
    </FormStackProvider>
  );
}
