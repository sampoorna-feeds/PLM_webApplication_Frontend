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
import { Search, Loader2, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OutwardGateEntryColumnFilter } from "./column-filter";
import { cn } from "@/lib/utils";
import type { ColumnConfig } from "./column-config";
import {
  getPostedPurchaseReturnShipments,
  getTransferShipments,
  getSalesShipments,
  type OutwardGateEntrySourceType,
} from "@/lib/api/services/outward-gate-entry.service";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/date";

interface SourceLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sourceNo: string, sourceData: any) => void;
  sourceType: OutwardGateEntrySourceType;
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
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>("Posting_Date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>("desc");

  // Pagination state
  const pageSize = 100;
  const [totalCount, setTotalCount] = useState(0);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const getColumns = (): ColumnConfig[] => {
    const baseCols: ColumnConfig[] = [
      { id: "No", label: "No.", sortable: true, filterType: "text" },
    ];
    
    if (sourceType === "Transfer Shipment") {
      baseCols.push(
        { id: "Transfer_from_Code", label: "Transfer From Code", sortable: true, filterType: "text" },
        { id: "Transfer_from_Name", label: "Transfer From Name", sortable: true, filterType: "text" },
        { id: "Transfer_to_Code", label: "Transfer To Code", sortable: true, filterType: "text" },
        { id: "Transfer_to_Name", label: "Transfer To Name", sortable: true, filterType: "text" }
      );
    } else {
      baseCols.push(
        { 
          id: sourceType === "Posted Purchase Return Shipment" ? "Buy_from_Vendor_Name" : "Sell_to_Customer_Name", 
          label: sourceType === "Posted Purchase Return Shipment" ? "Vendor Name" : "Customer Name", 
          sortable: true, 
          filterType: "text" 
        },
        { id: "Location_Code", label: "Location", sortable: true, filterType: "text" }
      );
    }

    baseCols.push(
      { id: "Posting_Date", label: "Date", sortable: true, filterType: "date" },
    );
    
    return baseCols;
  };

  const columns = getColumns();

  // Disconnect observer on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const isLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const isAllFetchedRef = useRef(false);
  const pageRef = useRef(1);
  const lastRequestId = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async (page: number, isNewSearch: boolean) => {
    const requestId = ++lastRequestId.current;
    
    if (isNewSearch) {
      isLoadingRef.current = true;
      setIsLoading(true);
      setData([]);
      setTotalCount(0);
      pageRef.current = 1;
      isAllFetchedRef.current = false;
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    } else {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
    }

    try {
      const params = {
        $top: pageSize,
        $skip: (page - 1) * pageSize,
        searchTerm: debouncedSearch || undefined,
        branchCode: branchCode || undefined,
        locationCode: locationCode || undefined,
        filters: columnFilters,
        $orderby: sortColumn && sortDirection ? `${sortColumn} ${sortDirection}` : undefined,
      };

      let result;
      if (sourceType === "Posted Purchase Return Shipment") {
        result = await getPostedPurchaseReturnShipments(params);
      } else if (sourceType === "Transfer Shipment") {
        result = await getTransferShipments(params);
      } else if (sourceType === "Sales Shipment") {
        result = await getSalesShipments(params);
      }

      if (requestId !== lastRequestId.current) return;

      if (result) {
        if (isNewSearch) {
          setData(result.data);
          isAllFetchedRef.current = result.data.length >= result.totalCount;
        } else {
          setData(prev => {
            const next = [...prev, ...result.data];
            isAllFetchedRef.current = next.length >= result.totalCount;
            return next;
          });
        }
        setTotalCount(result.totalCount);
        pageRef.current = page;
      }
    } catch (error) {
      console.error("Error fetching source data:", error);
    } finally {
      if (requestId === lastRequestId.current) {
        if (isNewSearch) {
          isLoadingRef.current = false;
          setIsLoading(false);
        } else {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
        }
      }
    }
  }, [sourceType, debouncedSearch, branchCode, locationCode, columnFilters, sortColumn, sortDirection]);

  // Reset and fetch page 1 when search params, sorting or open state changes
  useEffect(() => {
    if (isOpen) {
      fetchData(1, true);
    }
  }, [isOpen, fetchData]);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-40 shrink-0" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-foreground shrink-0" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-foreground shrink-0" />
    );
  };

  // Callback ref for infinite scroll sentinel
  const sentinelRef = useCallback((node: HTMLTableRowElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node && isOpen) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            !isLoadingRef.current &&
            !isLoadingMoreRef.current &&
            !isAllFetchedRef.current
          ) {
            fetchData(pageRef.current + 1, false);
          }
        },
        {
          threshold: 0.1,
          root: scrollContainerRef.current,
        }
      );
      observerRef.current.observe(node);
    }
  }, [isOpen, fetchData]);

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

        <Table containerClassName="flex-1 overflow-auto" containerRef={scrollContainerRef}>
          <TableHeader className="bg-muted sticky top-0 z-10 shadow-xs">
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.id} className="whitespace-nowrap px-1 py-1.5 h-9 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className={cn(
                        "font-bold select-none",
                        col.sortable && "cursor-pointer hover:text-foreground/80 flex items-center gap-1"
                      )}
                      onClick={() => col.sortable && handleSort(col.id)}
                    >
                      {col.label}
                      {col.sortable && renderSortIcon(col.id)}
                    </span>
                    <OutwardGateEntryColumnFilter
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

                  return (
                    <TableRow
                      key={item.id || no || `source-${index}`}
                      className="hover:bg-muted cursor-pointer"
                      onClick={() => onSelect(no, item)}
                    >
                      <TableCell className="px-1 py-1.5 text-xs font-medium">{no}</TableCell>
                      {sourceType === "Transfer Shipment" ? (
                        <>
                          <TableCell className="px-1 py-1.5 text-xs">{item.Transfer_from_Code}</TableCell>
                          <TableCell className="px-1 py-1.5 text-xs">{item.Transfer_from_Name}</TableCell>
                          <TableCell className="px-1 py-1.5 text-xs">{item.Transfer_to_Code}</TableCell>
                          <TableCell className="px-1 py-1.5 text-xs">{item.Transfer_to_Name}</TableCell>
                        </>
                      ) : (
                        <TableCell className="px-1 py-1.5 text-xs">{name}</TableCell>
                      )}
                      {sourceType !== "Transfer Shipment" && <TableCell className="px-1 py-1.5 text-xs">{location}</TableCell>}
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
                      className="py-4 text-center border-b-0"
                    >
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                )}
                {/* Sentinel Row for IntersectionObserver */}
                <TableRow ref={sentinelRef} className="hover:bg-transparent border-0 h-4">
                  <TableCell colSpan={columns.length} className="p-0 border-0 h-4" />
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
        <div className="text-muted-foreground border-t px-4 py-2 text-[10px] font-bold tracking-wider uppercase">
          Showing {data.length} of {totalCount} records
        </div>
      </DialogContent>
    </Dialog>
  );
}
