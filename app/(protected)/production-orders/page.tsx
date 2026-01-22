/**
 * Production Orders page
 * Protected route for production orders
 */

import ProductionOrdersForm from "@/components/forms/production-orders";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Production Orders",
};

export default function ProductionOrderPage() {
  return <ProductionOrdersForm />;
}
