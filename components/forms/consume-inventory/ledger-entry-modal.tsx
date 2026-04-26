"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ItemLedgerEntry } from "@/lib/api/services/report-ledger.service";
import { Search } from "lucide-react";
import { useState } from "react";

interface LedgerEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ItemLedgerEntry[];
  onSelect: (entry: ItemLedgerEntry) => void;
  title: string;
  isLoading?: boolean;
}

export function LedgerEntryModal({
  isOpen,
  onClose,
  entries,
  onSelect,
  title,
  isLoading = false,
}: LedgerEntryModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEntries = entries.filter((entry) => {
    const searchStr = searchTerm.toLowerCase();
    return (
      String(entry.Entry_No).toLowerCase().includes(searchStr) ||
      (entry.Document_No?.toLowerCase() || "").includes(searchStr) ||
      (entry.Lot_No?.toLowerCase() || "").includes(searchStr) ||
      (entry.Location_Code?.toLowerCase() || "").includes(searchStr)
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-primary/10 bg-background/95 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[24px] p-0 shadow-2xl backdrop-blur-xl sm:max-w-[90vw] lg:max-w-[1200px]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <div className="relative mt-4">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by Entry No, Document No, Lot No, or Location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 pt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <div className="relative">
                <div className="border-primary/20 border-t-primary h-12 w-12 animate-spin rounded-full border-4" />
                <Search className="text-primary/40 absolute inset-0 m-auto h-5 w-5" />
              </div>
              <p className="text-muted-foreground animate-pulse text-sm font-medium">
                Searching ledger entries...
              </p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-muted/5 rounded-xl border-2 border-dashed py-24 text-center">
              <div className="bg-muted/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Search className="text-muted-foreground/40 h-8 w-8" />
              </div>
              <h3 className="text-foreground text-lg font-semibold">
                No entries found
              </h3>
              <p className="text-muted-foreground mx-auto mt-1 max-w-[250px] text-sm">
                Try adjusting your search terms or check if the item has
                available stock.
              </p>
            </div>
          ) : (
            <div className="bg-background overflow-hidden rounded-xl border shadow-md">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b backdrop-blur-md">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px] px-4 py-4 text-xs font-bold tracking-wider uppercase">
                      Entry No
                    </TableHead>
                    <TableHead className="w-[140px] px-4 py-4 text-xs font-bold tracking-wider uppercase">
                      Date
                    </TableHead>
                    <TableHead className="min-w-[180px] px-4 py-4 text-xs font-bold tracking-wider uppercase">
                      Document No
                    </TableHead>
                    <TableHead className="w-[150px] px-4 py-4 text-xs font-bold tracking-wider uppercase">
                      Lot No
                    </TableHead>
                    <TableHead className="w-[120px] px-4 py-4 text-xs font-bold tracking-wider uppercase">
                      Location
                    </TableHead>
                    <TableHead className="w-[100px] px-4 py-4 text-right text-xs font-bold tracking-wider uppercase">
                      Quantity
                    </TableHead>
                    <TableHead className="w-[120px] px-4 py-4 text-right text-xs font-bold tracking-wider uppercase">
                      Remaining
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow
                      key={entry.Entry_No}
                      className="group hover:bg-primary/[0.08] cursor-pointer border-b transition-colors last:border-0"
                      onClick={() => {
                        onSelect(entry);
                        onClose();
                      }}
                    >
                      <TableCell className="px-4 py-3 font-mono text-sm font-medium">
                        {entry.Entry_No}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        {entry.Posting_Date}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className="bg-muted/50 border-none px-2 py-0.5 font-mono text-[10px]"
                        >
                          {entry.Document_No}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {entry.Lot_No ? (
                          <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-bold whitespace-nowrap text-emerald-600">
                            {entry.Lot_No}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px] font-bold tracking-tight uppercase opacity-50">
                            No Lot
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="border-primary/20 text-primary bg-primary/5 text-[10px] font-black"
                        >
                          {entry.Location_Code}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-mono text-sm font-medium">
                        {entry.Quantity?.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <span className="text-primary font-mono text-base font-black">
                          {entry.Remaining_Quantity?.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
