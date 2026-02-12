import ReportLedgerForm from "@/components/forms/report-ledger/report-ledger-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report Ledger",
};

export default function ReportLedgerPage() {
  return <ReportLedgerForm />;
}
