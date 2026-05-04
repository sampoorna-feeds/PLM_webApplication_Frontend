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
import { Search, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InwardGateEntryColumnFilter } from "./column-filter";
import type { ColumnConfig } from "./column-config";
import {
  getPurchaseOrders,
  getSalesReturnOrders,
  getTransferOrders,
  type InwardGateEntrySourceType,
} from "@/lib/api/services/inward-gate-entry.service";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/date";

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
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef<IntersectionObserver | null>(null);
  const fetchGenRef = useRef(0);

  const getColumns = (): ColumnConfig[] => {
    const baseCols: ColumnConfig[] = [
      { id: "No", label: "No.", sortable: true, filterType: "text" },
    ];
    
    if (sourceType === "Transfer Receipt") {
      baseCols.push(
        { id: "Transfer_from_Code", label: "Transfer From Code", sortable: true, filterType: "text" },
        { id: "Transfer_from_Name", label: "Transfer From Name", sortable: true, filterType: "text" },
        { id: "Transfer_to_Code", label: "Transfer To Code", sortable: true, filterType: "text" },
        { id: "Transfer_to_Name", label: "Transfer To Name", sortable: true, filterType: "text" }
      );
    } else {
      baseCols.push(
        { 
          id: sourceType === "Purchase Order" ? "Buy_from_Vendor_Name" : "Sell_to_Customer_Name", 
          label: sourceType === "Purchase Order" ? "Vendor Name" : "Customer Name", 
          sortable: true, 
          filterType: "text" 
        },
        { id: "Location_Code", label: "Location", sortable: true, filterType: "text" }
      );
    }

    baseCols.push(
      { id: sourceType === "Purchase Order" ? "Document_Date" : "Posting_Date", label: "Date", sortable: true, filterType: "date" },
      { id: "Status", label: "Status", sortable: true, filterType: "text" }
    );
    
    return baseCols;
  };

  const columns = getColumns();

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
  }, [sourceType, debouncedSearch, branchCode, locationCode, isOpen, columnFilters]);

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
        filters: columnFilters,
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

  const activeFiltersCount = Object.keys(columnFilters).length + (searchQuery ? 1 : 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] sm:max-w-[95vw] w-fit overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select {sourceType}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center mb-4">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
            <Input
              placeholder="Search by No., Code or Name..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSearchQuery("");
                setColumnFilters({});
              }}
              className="h-9 gap-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-3 w-3" />
              Clear Filters
              <Badge variant="secondary" className="ml-1 h-4 min-w-4 rounded-full px-1 text-[10px]">
                {activeFiltersCount}
              </Badge>
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.id} className="whitespace-nowrap px-1 py-1.5 h-9 text-xs">
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      <InwardGateEntryColumnFilter
                        column={col}
                        value={columnFilters[col.id]?.value ?? ""}
                        valueTo={columnFilters[col.id]?.valueTo}
                        onChange={(value, valueTo) => {
                          setColumnFilters(prev => {
                            const next = { ...prev };
                            if (!value && !valueTo) {
                              delete next[col.id];
                            } else {
                              next[col.id] = { value, valueTo };
                            }
                            return next;
                          });
                        }}
                      />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && data.length === 0 ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: columns.length }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
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
                    const location = item.Location_Code || item.Transfer_to_Code || "";

                    const isLastElement = index === data.length - 1;

                    return (
                      <TableRow
                        key={item.id || no || `source-${index}`}
                        ref={isLastElement ? lastElementRef : undefined}
                        className="hover:bg-muted cursor-pointer"
                        onClick={() => onSelect(no, item)}
                      >
                        <TableCell className="px-1 py-1.5 text-xs font-medium">{no}</TableCell>
                        {sourceType === "Transfer Receipt" ? (
                          <>
                            <TableCell className="px-1 py-1.5 text-xs">{item.Transfer_from_Code}</TableCell>
                            <TableCell className="px-1 py-1.5 text-xs">{item.Transfer_from_Name}</TableCell>
                            <TableCell className="px-1 py-1.5 text-xs">{item.Transfer_to_Code}</TableCell>
                            <TableCell className="px-1 py-1.5 text-xs">{item.Transfer_to_Name}</TableCell>
                          </>
                        ) : (
                          <TableCell className="px-1 py-1.5 text-xs">{name}</TableCell>
                        )}
                        {sourceType !== "Transfer Receipt" && <TableCell className="px-1 py-1.5 text-xs">{location}</TableCell>}
                        <TableCell className="px-1 py-1.5 text-xs">
                          {date ? formatDate(date) : "-"}
                        </TableCell>
                        <TableCell className="px-1 py-1.5 text-xs">{status}</TableCell>
                      </TableRow>
                    );
                  })}
                  {isLoadingMore && (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="py-4 text-center"
                      >
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="text-muted-foreground border-t px-4 py-2 text-[10px] font-bold tracking-wider uppercase">
          Showing {data.length} of {totalCount} records
        </div>
      </DialogContent>
    </Dialog>
  );
}
