/**
 * Report Ledger Layout
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report Ledger",
};

export default function ReportLedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
