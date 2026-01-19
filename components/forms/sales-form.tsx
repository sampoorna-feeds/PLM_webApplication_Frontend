'use client';

/**
 * Sales Form component
 * Tabbed view with tables for Sales Order, Sales Invoice, Sales Return Order, and Sales Credit Memo
 */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { FieldTitle } from '@/components/ui/field';

// Dummy data for Sales Order
const dummySalesOrderData = [
  {
    id: 1,
    orderNo: 'SO-001',
    customerNo: 'CUST001',
    customerName: 'ABC Corporation',
    orderDate: '2026-01-15',
    postingDate: '2026-01-15',
    documentDate: '2026-01-15',
    externalDocumentNo: 'EXT001',
    status: 'Pending',
    amount: 50000,
  },
  {
    id: 2,
    orderNo: 'SO-002',
    customerNo: 'CUST002',
    customerName: 'XYZ Industries',
    orderDate: '2026-01-16',
    postingDate: '2026-01-16',
    documentDate: '2026-01-16',
    externalDocumentNo: 'EXT002',
    status: 'Approved',
    amount: 75000,
  },
  {
    id: 3,
    orderNo: 'SO-003',
    customerNo: 'CUST003',
    customerName: 'Global Trading Co.',
    orderDate: '2026-01-17',
    postingDate: '2026-01-17',
    documentDate: '2026-01-17',
    externalDocumentNo: 'EXT003',
    status: 'Completed',
    amount: 30000,
  },
];

// Dummy data for Sales Invoice
const dummySalesInvoiceData = [
  {
    id: 1,
    invoiceNo: 'SI-001',
    customerNo: 'CUST001',
    customerName: 'ABC Corporation',
    invoiceDate: '2026-01-15',
    postingDate: '2026-01-15',
    documentDate: '2026-01-15',
    externalDocumentNo: 'EXT001',
    status: 'Posted',
    amount: 50000,
  },
  {
    id: 2,
    invoiceNo: 'SI-002',
    customerNo: 'CUST002',
    customerName: 'XYZ Industries',
    invoiceDate: '2026-01-16',
    postingDate: '2026-01-16',
    documentDate: '2026-01-16',
    externalDocumentNo: 'EXT002',
    status: 'Posted',
    amount: 75000,
  },
  {
    id: 3,
    invoiceNo: 'SI-003',
    customerNo: 'CUST003',
    customerName: 'Global Trading Co.',
    invoiceDate: '2026-01-17',
    postingDate: '2026-01-17',
    documentDate: '2026-01-17',
    externalDocumentNo: 'EXT003',
    status: 'Pending',
    amount: 30000,
  },
];

// Dummy data for Sales Return Order
const dummySalesReturnOrderData = [
  {
    id: 1,
    returnOrderNo: 'SRO-001',
    customerNo: 'CUST001',
    customerName: 'ABC Corporation',
    returnDate: '2026-01-15',
    postingDate: '2026-01-15',
    documentDate: '2026-01-15',
    externalDocumentNo: 'EXT001',
    status: 'Pending',
    amount: 5000,
  },
  {
    id: 2,
    returnOrderNo: 'SRO-002',
    customerNo: 'CUST002',
    customerName: 'XYZ Industries',
    returnDate: '2026-01-16',
    postingDate: '2026-01-16',
    documentDate: '2026-01-16',
    externalDocumentNo: 'EXT002',
    status: 'Approved',
    amount: 7500,
  },
  {
    id: 3,
    returnOrderNo: 'SRO-003',
    customerNo: 'CUST003',
    customerName: 'Global Trading Co.',
    returnDate: '2026-01-17',
    postingDate: '2026-01-17',
    documentDate: '2026-01-17',
    externalDocumentNo: 'EXT003',
    status: 'Completed',
    amount: 3000,
  },
];

// Dummy data for Sales Credit Memo
const dummySalesCreditMemoData = [
  {
    id: 1,
    creditMemoNo: 'SCM-001',
    customerNo: 'CUST001',
    customerName: 'ABC Corporation',
    creditMemoDate: '2026-01-15',
    postingDate: '2026-01-15',
    documentDate: '2026-01-15',
    externalDocumentNo: 'EXT001',
    status: 'Posted',
    amount: 5000,
  },
  {
    id: 2,
    creditMemoNo: 'SCM-002',
    customerNo: 'CUST002',
    customerName: 'XYZ Industries',
    creditMemoDate: '2026-01-16',
    postingDate: '2026-01-16',
    documentDate: '2026-01-16',
    externalDocumentNo: 'EXT002',
    status: 'Posted',
    amount: 7500,
  },
  {
    id: 3,
    creditMemoNo: 'SCM-003',
    customerNo: 'CUST003',
    customerName: 'Global Trading Co.',
    creditMemoDate: '2026-01-17',
    postingDate: '2026-01-17',
    documentDate: '2026-01-17',
    externalDocumentNo: 'EXT003',
    status: 'Pending',
    amount: 3000,
  },
];

type SalesType = 'order' | 'invoice' | 'return-order' | 'credit-memo';

export function SalesForm() {
  const [activeTab, setActiveTab] = useState<SalesType>('order');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerNo: '',
    customerName: '',
    shipToCode: '',
    shippingFrom: '',
    salesPersonCode: '',
    locationCode: '',
    postingDate: '',
    documentDate: '',
    orderDate: '',
    externalDocumentNo: '',
    status: '',
    invoiceType: '',
    lob: '',
    branch: '',
    loc: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // TODO: Implement API call
    console.log('Form submitted:', formData, 'Type:', activeTab);
    setIsFormOpen(false);
    // Reset form
    setFormData({
      customerNo: '',
      customerName: '',
      shipToCode: '',
      shippingFrom: '',
      salesPersonCode: '',
      locationCode: '',
      postingDate: '',
      documentDate: '',
      orderDate: '',
      externalDocumentNo: '',
      status: '',
      invoiceType: '',
      lob: '',
      branch: '',
      loc: '',
    });
  };

  const getButtonLabel = (type: SalesType) => {
    switch (type) {
      case 'order':
        return 'Create Order';
      case 'invoice':
        return 'Create Invoice';
      case 'return-order':
        return 'Create Return Order';
      case 'credit-memo':
        return 'Create Credit Memo';
      default:
        return 'Create';
    }
  };

  const getFormTitle = (type: SalesType) => {
    switch (type) {
      case 'order':
        return 'Sales Order Form';
      case 'invoice':
        return 'Sales Invoice Form';
      case 'return-order':
        return 'Sales Return Order Form';
      case 'credit-memo':
        return 'Sales Credit Memo Form';
      default:
        return 'Sales Form';
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col p-4 gap-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SalesType)}>
        <div className="flex flex-col gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="order" className="flex-1">Sales Order</TabsTrigger>
            <TabsTrigger value="invoice" className="flex-1">Sales Invoice</TabsTrigger>
            <TabsTrigger value="return-order" className="flex-1">Sales Return Order</TabsTrigger>
            <TabsTrigger value="credit-memo" className="flex-1">Sales Credit Memo</TabsTrigger>
          </TabsList>
          <div className="flex justify-end">
            <Button
              onClick={() => setIsFormOpen(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {getButtonLabel(activeTab)}
            </Button>
          </div>
        </div>

        {/* Sales Order Tab */}
        <TabsContent value="order" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-3 text-xs font-medium">Order No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Customer No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Customer Name</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Order Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Posting Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Document Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">External Doc No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Status</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dummySalesOrderData.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/50">
                      <TableCell className="px-3 py-3 text-xs">{order.orderNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{order.customerNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{order.customerName}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{order.orderDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{order.postingDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{order.documentDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{order.externalDocumentNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{order.status}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{order.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Sales Invoice Tab */}
        <TabsContent value="invoice" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-3 text-xs font-medium">Invoice No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Customer No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Customer Name</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Invoice Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Posting Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Document Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">External Doc No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Status</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dummySalesInvoiceData.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell className="px-3 py-3 text-xs">{invoice.invoiceNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{invoice.customerNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{invoice.customerName}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{invoice.invoiceDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{invoice.postingDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{invoice.documentDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{invoice.externalDocumentNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{invoice.status}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{invoice.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Sales Return Order Tab */}
        <TabsContent value="return-order" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-3 text-xs font-medium">Return Order No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Customer No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Customer Name</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Return Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Posting Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Document Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">External Doc No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Status</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dummySalesReturnOrderData.map((returnOrder) => (
                    <TableRow key={returnOrder.id} className="hover:bg-muted/50">
                      <TableCell className="px-3 py-3 text-xs">{returnOrder.returnOrderNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{returnOrder.customerNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{returnOrder.customerName}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{returnOrder.returnDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{returnOrder.postingDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{returnOrder.documentDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{returnOrder.externalDocumentNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{returnOrder.status}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{returnOrder.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Sales Credit Memo Tab */}
        <TabsContent value="credit-memo" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-3 text-xs font-medium">Credit Memo No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Customer No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Customer Name</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Credit Memo Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Posting Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Document Date</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">External Doc No.</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Status</TableHead>
                    <TableHead className="px-3 py-3 text-xs font-medium">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dummySalesCreditMemoData.map((creditMemo) => (
                    <TableRow key={creditMemo.id} className="hover:bg-muted/50">
                      <TableCell className="px-3 py-3 text-xs">{creditMemo.creditMemoNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{creditMemo.customerNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{creditMemo.customerName}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{creditMemo.creditMemoDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{creditMemo.postingDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{creditMemo.documentDate}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{creditMemo.externalDocumentNo}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{creditMemo.status}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">{creditMemo.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Slide-in Form */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent 
          side="right" 
          className="!w-[40vw] !max-w-[40vw] sm:!max-w-[40vw] p-0 flex flex-col"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-xl">{getFormTitle(activeTab)}</SheetTitle>
            <SheetDescription>Add a new {activeTab.replace('-', ' ')} entry</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Customer Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldTitle>Customer No.</FieldTitle>
                    <Input
                      value={formData.customerNo}
                      onChange={(e) => handleInputChange('customerNo', e.target.value)}
                      placeholder="Enter customer number"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldTitle>Customer Name</FieldTitle>
                    <Input
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      placeholder="Enter customer name"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Shipping Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldTitle>Ship to Code</FieldTitle>
                    <Input
                      value={formData.shipToCode}
                      onChange={(e) => handleInputChange('shipToCode', e.target.value)}
                      placeholder="Enter ship to code"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldTitle>Shipping From</FieldTitle>
                    <Input
                      value={formData.shippingFrom}
                      onChange={(e) => handleInputChange('shippingFrom', e.target.value)}
                      placeholder="Enter shipping from"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldTitle>Sales Person Code/Name</FieldTitle>
                    <Input
                      value={formData.salesPersonCode}
                      onChange={(e) => handleInputChange('salesPersonCode', e.target.value)}
                      placeholder="Enter sales person code/name"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldTitle>Location Code</FieldTitle>
                    <Input
                      value={formData.locationCode}
                      onChange={(e) => handleInputChange('locationCode', e.target.value)}
                      placeholder="Enter location code"
                    />
                  </div>
                </div>
              </div>

              {/* Date Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Date Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldTitle>Posting Date</FieldTitle>
                    <Input
                      type="date"
                      value={formData.postingDate}
                      onChange={(e) => handleInputChange('postingDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldTitle>Document Date</FieldTitle>
                    <Input
                      type="date"
                      value={formData.documentDate}
                      onChange={(e) => handleInputChange('documentDate', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldTitle>Order Date</FieldTitle>
                    <Input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => handleInputChange('orderDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldTitle>External Document No.</FieldTitle>
                    <Input
                      value={formData.externalDocumentNo}
                      onChange={(e) => handleInputChange('externalDocumentNo', e.target.value)}
                      placeholder="Enter external document number"
                    />
                  </div>
                </div>
              </div>

              {/* Document Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Document Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FieldTitle>Status</FieldTitle>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FieldTitle>Invoice Type</FieldTitle>
                    <Select
                      value={formData.invoiceType}
                      onValueChange={(value) => handleInputChange('invoiceType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select invoice type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Tax Invoice">Tax Invoice</SelectItem>
                        <SelectItem value="Credit Note">Credit Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Dimension Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Dimension Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <FieldTitle>LOB</FieldTitle>
                    <Input
                      value={formData.lob}
                      onChange={(e) => handleInputChange('lob', e.target.value)}
                      placeholder="Enter LOB"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldTitle>Branch</FieldTitle>
                    <Input
                      value={formData.branch}
                      onChange={(e) => handleInputChange('branch', e.target.value)}
                      placeholder="Enter branch"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldTitle>LOC</FieldTitle>
                    <Input
                      value={formData.loc}
                      onChange={(e) => handleInputChange('loc', e.target.value)}
                      placeholder="Enter LOC"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t">
            <Button onClick={handleSubmit} className="w-full">
              {getButtonLabel(activeTab)}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
