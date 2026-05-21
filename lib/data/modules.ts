import React from "react";
import {
  Store,
  ShoppingCart,
  ClipboardCheck,
  Truck,
  ArrowLeftRight,
  Receipt,
  BookOpenCheck,
  Package,
  ReceiptText,
  CreditCard,
  Factory
} from "lucide-react";

export interface SubItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  isPosted?: boolean;
}

export interface ModuleCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  subItems: SubItem[];
  colorClass: string;
  badgeColor: string;
}

export const modules: ModuleCategory[] = [
  {
    id: "sales",
    title: "Sales & Distribution",
    description: "Manage sales orders, invoices, and process customer shipments and returns.",
    icon: Store,
    colorClass: "border-t-4 border-t-emerald-500 dark:border-t-emerald-600",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    subItems: [
      { title: "Sales Order", url: "/sales/order", icon: Package, isPosted: false },
      { title: "Sales Invoice", url: "/sales/invoice", icon: ReceiptText, isPosted: false },
      { title: "Return Order", url: "/sales/return-order", icon: ArrowLeftRight, isPosted: false },
      { title: "Credit Memo", url: "/sales/credit-memo", icon: CreditCard, isPosted: false },
      { title: "Posted Shipment", url: "/sales/posted-shipment", icon: Truck, isPosted: true },
      { title: "Posted Invoice", url: "/sales/posted-invoice", icon: ClipboardCheck, isPosted: true },
      { title: "Posted Credit Memo", url: "/sales/posted-credit-memo", icon: ClipboardCheck, isPosted: true },
    ]
  },
  {
    id: "purchase",
    title: "Purchase & Procurement",
    description: "Handle vendor purchase orders, receive goods, and manage vendor invoices and returns.",
    icon: ShoppingCart,
    colorClass: "border-t-4 border-t-blue-500 dark:border-t-blue-600",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    subItems: [
      { title: "Purchase Order", url: "/purchase/order", icon: Package, isPosted: false },
      { title: "Purchase Invoice", url: "/purchase/invoice", icon: ReceiptText, isPosted: false },
      { title: "Return Order", url: "/purchase/return-order", icon: ArrowLeftRight, isPosted: false },
      { title: "Credit Memo", url: "/purchase/credit-memo", icon: CreditCard, isPosted: false },
      { title: "Posted Receipt", url: "/purchase/posted-receipt", icon: ClipboardCheck, isPosted: true },
      { title: "Posted Invoice", url: "/purchase/posted-invoice", icon: ClipboardCheck, isPosted: true },
      { title: "Posted Return Shipment", url: "/purchase/posted-return-shipment", icon: ClipboardCheck, isPosted: true },
      { title: "Posted Credit Memo", url: "/purchase/posted-credit-memo", icon: ClipboardCheck, isPosted: true },
    ]
  },
  {
    id: "gate-entry",
    title: "Gate Entry & Logistics",
    description: "Track and authorize inward/outward vehicle and cargo movement at the facility gate.",
    icon: Truck,
    colorClass: "border-t-4 border-t-amber-500 dark:border-t-amber-600",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    subItems: [
      { title: "Inward Gate Entry", url: "/inward-gate-entry", icon: Truck, isPosted: false },
      { title: "Outward Gate Entry", url: "/outward-gate-entry", icon: Truck, isPosted: false },
      { title: "Posted Inward", url: "/posted-inward-gate-entry", icon: ClipboardCheck, isPosted: true },
      { title: "Posted Outward", url: "/posted-outward-gate-entry", icon: ClipboardCheck, isPosted: true },
    ]
  },
  {
    id: "qc",
    title: "Quality Control (QC)",
    description: "Review and record quality inspection details of incoming inventory and materials.",
    icon: ClipboardCheck,
    colorClass: "border-t-4 border-t-red-500 dark:border-t-red-600",
    badgeColor: "bg-red-500/10 text-red-600 dark:text-red-400",
    subItems: [
      { title: "QC Receipt", url: "/qc-receipt", icon: ClipboardCheck, isPosted: false },
      { title: "Posted QC Receipt", url: "/posted-qc-receipt", icon: ClipboardCheck, isPosted: true },
    ]
  },
  {
    id: "stock",
    title: "Stock Transfer",
    description: "Move inventory between warehouses and locations, shipping and receiving transfer documents.",
    icon: ArrowLeftRight,
    colorClass: "border-t-4 border-t-purple-500 dark:border-t-purple-600",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    subItems: [
      { title: "Transfer Order", url: "/transfer-orders", icon: Package, isPosted: false },
      { title: "Posted Transfer Shipment", url: "/posted-transfer-shipments", icon: Truck, isPosted: true },
      { title: "Posted Transfer Receipt", url: "/posted-transfer-receipts", icon: ClipboardCheck, isPosted: true },
    ]
  },
  {
    id: "forms",
    title: "Operations & Forms",
    description: "Submit journal vouchers, manage manufacturing orders, and record inventory consumption.",
    icon: Receipt,
    colorClass: "border-t-4 border-t-cyan-500 dark:border-t-cyan-600",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    subItems: [
      { title: "Voucher Form", url: "/voucher-form", icon: Receipt, isPosted: false },
      { title: "Production Order", url: "/production-orders", icon: Factory, isPosted: false },
      { title: "Consume Inventory", url: "/consume-inventory", icon: Package, isPosted: false },
    ]
  },
  {
    id: "ledger",
    title: "Ledgers & Reports",
    description: "Access general ledger entries, vendor accounts, item ledger details, and inventory stock reports.",
    icon: BookOpenCheck,
    colorClass: "border-t-4 border-t-indigo-500 dark:border-t-indigo-600",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    subItems: [
      { title: "Vendor Ledger", url: "/ledger/vendor-ledger", icon: BookOpenCheck, isPosted: false },
      { title: "GL Entry", url: "/ledger/gl-entry", icon: BookOpenCheck, isPosted: false },
      { title: "Item Ledger", url: "/ledger/report-ledger", icon: BookOpenCheck, isPosted: false },
      { title: "Consumption Report", url: "/ledger/consumption-report", icon: BookOpenCheck, isPosted: false },
      { title: "Stock Report", url: "/ledger/stock-report", icon: BookOpenCheck, isPosted: false },
    ]
  }
];
