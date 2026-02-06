"use client";

import { useState, useEffect } from "react";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  getProductionJournal,
  type ProductionJournalEntry,
} from "@/lib/api/services/production-orders.service";

interface ProductionOrderPostSheetProps {
  prodOrderNo: string;
}

export function ProductionOrderPostSheet({
  prodOrderNo,
}: ProductionOrderPostSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<
    ProductionJournalEntry[]
  >([]);

  // Fetch journal entries when sheet opens
  useEffect(() => {
    if (isOpen && prodOrderNo) {
      const fetchJournalEntries = async () => {
        setIsLoading(true);
        try {
          const entries = await getProductionJournal(prodOrderNo);
          setJournalEntries(entries);
          if (entries.length === 0) {
            toast.info("No journal entries found for this production order");
          }
        } catch (error) {
          console.error("Error fetching production journal:", error);
          toast.error("Failed to load production journal entries");
          setJournalEntries([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchJournalEntries();
    }
  }, [isOpen, prodOrderNo]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="default" size="sm" data-post-order-trigger>
          <FileText className="h-4 w-4 mr-2" />
          Post Order
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Production Journal - {prodOrderNo}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto mt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading journal entries...
              </p>
            </div>
          ) : journalEntries.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No journal entries found for this production order.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Line No.</TableHead>
                    <TableHead className="w-32">Entry Type</TableHead>
                    <TableHead>Item No.</TableHead>
                    <TableHead className="w-32 text-right">Quantity</TableHead>
                    <TableHead className="w-32 text-right">
                      Output Qty
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map((entry, index) => (
                    <TableRow key={`${entry.Line_No}-${index}`}>
                      <TableCell>{entry.Line_No}</TableCell>
                      <TableCell>{entry.Entry_Type}</TableCell>
                      <TableCell className="font-medium">
                        {entry.Item_No_ || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.Quantity?.toLocaleString() ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.Output_Quantity?.toLocaleString() ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Re-export as ProductionOrderPostDialog for backward compatibility
export { ProductionOrderPostSheet as ProductionOrderPostDialog };
