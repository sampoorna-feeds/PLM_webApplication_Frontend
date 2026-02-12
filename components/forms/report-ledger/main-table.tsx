"use client";

import {
  getItemLedgerEntries,
  ItemLedgerEntry,
} from "@/lib/api/services/report-ledger.service";
import { useEffect, useState } from "react";

export default function ReportLedgerMainTable() {
  const [entries, setEntries] = useState<ItemLedgerEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  useEffect(() => {
    getItemLedgerEntries()
      .then(({ entries, totalCount }) => {
        setEntries(entries);
        setTotalCount(totalCount);
      })
      .catch((error) => {
        console.error("Error fetching report ledger entries:", error);
      });
  }, []);

  return (
    <div>
      <h2>Report Ledger Main Table</h2>
      <span>{totalCount}</span>
      <pre>{JSON.stringify(entries, null, 2)}</pre>{" "}
    </div>
  );
}
