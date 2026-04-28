import { useState, useEffect, useRef, useCallback } from "react";
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

interface SourceLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sourceNo: string, sourceData: any) => void;
  sourceType: InwardGateEntrySourceType;
  branchCode?: string;
  locationCode?: string;
}

export function SourceLookupModal({
  isOpen,
  onClose,
  onSelect,
  sourceType,
  branchCode,
  locationCode,
}: SourceLookupModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef<IntersectionObserver | null>(null);
  const fetchGenRef = useRef(0);

  // Disconnect observer on unmount to prevent memory leak
  useEffect(() => () => { observer.current?.disconnect(); }, []);

  const lastElementRef = useCallback((node: HTMLTableRowElement | null) => {
    if (isLoading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setCurrentPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isLoadingMore, hasMore]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset and fetch page 1 when search params or open state changes
  useEffect(() => {
    if (isOpen) {
      fetchGenRef.current++;
      const gen = fetchGenRef.current;
      setData([]);
      setCurrentPage(1);
      setHasMore(true);
      fetchData(1, true, gen);
    }
  }, [sourceType, debouncedSearch, branchCode, locationCode, isOpen]);

  // Fetch next page when currentPage increments (IntersectionObserver trigger)
  useEffect(() => {
    if (isOpen && currentPage > 1) {
      fetchData(currentPage, false, fetchGenRef.current);
    }
  }, [currentPage, isOpen]);

  async function fetchData(page: number, isNewSearch: boolean, gen: number) {
    if (isNewSearch) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const params = {
        $top: pageSize,
        $skip: (page - 1) * pageSize,
        searchTerm: debouncedSearch || undefined,
        branchCode: branchCode || undefined,
        locationCode: locationCode || undefined,
      };

      let result;
      if (sourceType === "Purchase Order") {
        result = await getPurchaseOrders(params);
      } else if (sourceType === "Sales Return Order") {
        result = await getSalesReturnOrders(params);
      } else if (sourceType === "Transfer Receipt") {
        result = await getTransferOrders(params);
      }

      if (gen !== fetchGenRef.current) return;

      if (result) {
        if (isNewSearch) {
          setData(result.data);
        } else {
          setData(prev => [...prev, ...result.data]);
        }
        setTotalCount(result.totalCount);
        setHasMore(result.data.length === pageSize);
      }
    } catch (error) {
      if (gen !== fetchGenRef.current) return;
      console.error("Error fetching source data:", error);
    } finally {
      if (gen !== fetchGenRef.current) return;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] sm:max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle>Select {sourceType}</DialogTitle>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder={sourceType === "Transfer Receipt" ? "Search by No., Code or Name..." : "Search by No. or Name..."}
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
                {sourceType === "Transfer Receipt" ? (
                  <>
                    <TableHead>Transfer From Code</TableHead>
                    <TableHead>Transfer From Name</TableHead>
                    <TableHead>Transfer To Code</TableHead>
                    <TableHead>Transfer To Name</TableHead>
                  </>
                ) : (
                  <TableHead>
                    {sourceType === "Purchase Order"
                      ? "Vendor Name"
                      : "Customer Name"}
                  </TableHead>
                )}
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && data.length === 0 ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: sourceType === "Transfer Receipt" ? 8 : 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={sourceType === "Transfer Receipt" ? 8 : 5}
                    className="text-muted-foreground py-10 text-center"
                  >
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {data.map((item, index) => {
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
                    const location = item.Location_Code || "";

                    const isLastElement = index === data.length - 1;

                    return (
                      <TableRow
                        key={item.id || no || `source-${index}`}
                        ref={isLastElement ? lastElementRef : undefined}
                        className="hover:bg-muted cursor-pointer"
                        onClick={() => onSelect(no, item)}
                      >
                        <TableCell className="font-medium">{no}</TableCell>
                        {sourceType === "Transfer Receipt" ? (
                          <>
                            <TableCell>{item.Transfer_from_Code || "-"}</TableCell>
                            <TableCell>{item.Transfer_from_Name || "-"}</TableCell>
                            <TableCell>{item.Transfer_to_Code || "-"}</TableCell>
                            <TableCell>{item.Transfer_to_Name || "-"}</TableCell>
                          </>
                        ) : (
                          <TableCell>{name}</TableCell>
                        )}
                        <TableCell>{location}</TableCell>
                        <TableCell>
                          {date ? new Date(date).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>{status}</TableCell>
                      </TableRow>
                    );
                  })}
                  {isLoadingMore && (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`loading-more-${i}`}>
                        {Array.from({ length: sourceType === "Transfer Receipt" ? 8 : 5 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-muted-foreground flex items-center justify-between px-2 py-2 text-[10px] font-medium uppercase tracking-wider">
          <div>
            Showing {data.length} of {totalCount} records
          </div>
          {isLoadingMore && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading more...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
