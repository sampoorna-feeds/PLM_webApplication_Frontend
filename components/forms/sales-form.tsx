'use client';

/**
 * Sales Form component
 * Table view with slide-in form from right
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
import { FieldTitle } from '@/components/ui/field';

// Dummy sales data
const dummySalesData = [
  {
    id: 1,
    customerNo: 'CUST001',
    customerName: 'ABC Corporation',
    shipToCode: 'ST001',
    shippingFrom: 'Warehouse A',
    salesPersonCode: 'SP001',
    salesPersonName: 'John Doe',
    locationCode: 'LOC001',
    postingDate: '2026-01-15',
    documentDate: '2026-01-15',
    orderDate: '2026-01-10',
    externalDocumentNo: 'EXT001',
    status: 'Pending',
    invoiceType: 'Standard',
    lob: 'FEED',
    branch: '1001',
    loc: 'SFPL0021',
  },
  {
    id: 2,
    customerNo: 'CUST002',
    customerName: 'XYZ Industries',
    shipToCode: 'ST002',
    shippingFrom: 'Warehouse B',
    salesPersonCode: 'SP002',
    salesPersonName: 'Jane Smith',
    locationCode: 'LOC002',
    postingDate: '2026-01-16',
    documentDate: '2026-01-16',
    orderDate: '2026-01-11',
    externalDocumentNo: 'EXT002',
    status: 'Approved',
    invoiceType: 'Tax Invoice',
    lob: 'FEED',
    branch: '1002',
    loc: 'SFPL0022',
  },
  {
    id: 3,
    customerNo: 'CUST003',
    customerName: 'Global Trading Co.',
    shipToCode: 'ST003',
    shippingFrom: 'Warehouse A',
    salesPersonCode: 'SP001',
    salesPersonName: 'John Doe',
    locationCode: 'LOC001',
    postingDate: '2026-01-17',
    documentDate: '2026-01-17',
    orderDate: '2026-01-12',
    externalDocumentNo: 'EXT003',
    status: 'Completed',
    invoiceType: 'Standard',
    lob: 'FEED',
    branch: '1001',
    loc: 'SFPL0021',
  },
];

export function SalesForm() {
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
    console.log('Form submitted:', formData);
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

  return (
    <div className="flex w-full min-w-0 flex-col p-4 gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Sales Table</h1>
        <Button onClick={() => setIsFormOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Sales
        </Button>
      </div>

      {/* Sales Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-3 py-3 text-xs font-medium">Customer No.</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Customer Name</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Ship to Code</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Shipping From</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Sales Person</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Location Code</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Posting Date</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Document Date</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Order Date</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">External Doc No.</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Status</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Invoice Type</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">LOB</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">Branch</TableHead>
                <TableHead className="px-3 py-3 text-xs font-medium">LOC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummySalesData.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-muted/50">
                  <TableCell className="px-3 py-3 text-xs">{sale.customerNo}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.customerName}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.shipToCode}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.shippingFrom}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">
                    {sale.salesPersonCode} / {sale.salesPersonName}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.locationCode}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.postingDate}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.documentDate}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.orderDate}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.externalDocumentNo}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.status}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.invoiceType}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.lob}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.branch}</TableCell>
                  <TableCell className="px-3 py-3 text-xs">{sale.loc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Slide-in Form */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent 
          side="right" 
          className="!w-[40vw] !max-w-[40vw] sm:!max-w-[40vw] p-0 flex flex-col"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-xl">Sales Form</SheetTitle>
            <SheetDescription>Add a new sales entry</SheetDescription>
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
              Add Sales
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
