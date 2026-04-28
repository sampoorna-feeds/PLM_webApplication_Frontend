"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import {
  getPurchaseOrders,
  getSalesReturnOrders,
  getTransferOrders,
  type InwardGateEntrySourceType,
} from "@/lib/api/services/inward-gate-entry.service";
import { Skeleton } from "@/components/ui/skeleton";
import { InwardGateEntryPaginationControls } from "./pagination-controls";

interface SourceLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sourceNo: string, sourceData: any) => void;
  sourceType: InwardGateEntrySourceType;
}

export function SourceLookupModal({
  isOpen,
  onClose,
  onSelect,
  sourceType,
}: SourceLookupModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, sourceType, currentPage, pageSize, debouncedSearch]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const params = {
        $top: pageSize,
        $skip: (currentPage - 1) * pageSize,
        searchTerm: debouncedSearch || undefined,
      };

      let result;
      if (sourceType === "Purchase Order") {
        result = await getPurchaseOrders(params);
      } else if (sourceType === "Sales Return Order") {
        result = await getSalesReturnOrders(params);
      } else if (sourceType === "Transfer Receipt") {
        result = await getTransferOrders(params);
      }
      
      if (result) {
        setData(result.data);
        setTotalCount(result.totalCount);
      }
    } catch (error) {
      console.error("Error fetching source data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] sm:max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle>Select {sourceType}</DialogTitle>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search by No. or Name..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>
                  {sourceType === "Purchase Order"
                    ? "Vendor Name"
                    : sourceType === "Sales Return Order"
                      ? "Customer Name"
                      : "Transfer From"}
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground py-10 text-center"
                  >
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => {
                  const no = item.No || item["No."];
                  const name =
                    item.Buy_from_Vendor_Name ||
                    item.Sell_to_Customer_Name ||
                    item.Transfer_from_Name ||
                    "";
                  const date =
                    item.Order_Date ||
                    item.Posting_Date ||
                    item["Document Date"] ||
                    "";
                  const status = item.Status || "";

                  return (
                    <TableRow
                      key={item.id || no || `source-${index}`}
                      className="hover:bg-muted cursor-pointer"
                      onClick={() => onSelect(no, item)}
                    >
                      <TableCell className="font-medium">{no}</TableCell>
                      <TableCell>{name}</TableCell>
                      <TableCell>
                        {date ? new Date(date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>{status}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <InwardGateEntryPaginationControls
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
