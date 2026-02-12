/**
 * Production Orders Layout
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Production Orders",
};

export default function ProductionOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
