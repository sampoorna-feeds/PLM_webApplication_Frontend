import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getCustomerLedgerEntriesForDialog,
  applyCustomerLedgerEntry,
  type CustomerLedgerEntry,
} from "@/lib/api/services/customer-ledger.service";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Check,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApplyCustomerEntriesDialogProps {
  documentNo: string;
  customerNo: string;
  onSuccess: () => void;
  disabled?: boolean;
}

type SortDir = "asc" | "desc" | null;

interface ColConfig {
  id: string;
  label: string;
  sortable?: boolean;
  filterType?: "text";
  width?: string;
}

const COLUMNS: ColConfig[] = [
  { id: "Entry_No", label: "Entry No.", sortable: true, filterType: "text", width: "100px" },
  { id: "External_Document_No", label: "Ext. Doc. No.", sortable: true, filterType: "text", width: "160px" },
  { id: "Document_No", label: "Doc. No.", sortable: true, filterType: "text", width: "160px" },
  { id: "Document_Type", label: "Doc. Type", sortable: true, filterType: "text", width: "120px" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, filterType: "text", width: "120px" },
  { id: "Original_Amount", label: "Orig. Amount", sortable: true, filterType: "text", width: "120px" },
  { id: "Remaining_Amount", label: "Rem. Amount", sortable: true, filterType: "text", width: "120px" },
];

const visibleCols = COLUMNS.map((c) => c.id);
const PAGE_SIZE = 20;

export function ApplyCustomerEntriesDialog({
  documentNo,
  customerNo,
  onSuccess,
  disabled,
}: ApplyCustomerEntriesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedEntryMap, setSelectedEntryMap] = useState<Map<number, CustomerLedgerEntry>>(new Map());
  const [isApplying, setIsApplying] = useState(false);

  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debouncedSearchRef = useRef(debouncedSearch);
  const sortColumnRef = useRef(sortColumn);
  const sortDirectionRef = useRef(sortDirection);
  const columnFiltersRef = useRef(columnFilters);

  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
    sortColumnRef.current = sortColumn;
    sortDirectionRef.current = sortDirection;
    columnFiltersRef.current = columnFilters;
  }, [debouncedSearch, sortColumn, sortDirection, columnFilters]);

  const fetchInitial = useCallback(
    async (search: string, sortCol: string | null, sortDir: SortDir, colFilters: Record<string, string>) => {
      if (!customerNo || !isOpen) return;
      setIsLoading(true);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      try {
        const data = await getCustomerLedgerEntriesForDialog({
          customerNo,
          search: search || undefined,
          skip: 0,
          top: PAGE_SIZE,
          sortColumn: sortCol,
          sortDirection: sortDir,
          filters: colFilters,
          visibleColumns: visibleCols,
        });
        setEntries(data.value);
        setTotalCount(data.count);
      } catch {
        // errors handled in service
      } finally {
        setIsLoading(false);
      }
    },
    [customerNo, isOpen],
  );

  const fetchMore = useCallback(
    async (currentLength: number) => {
      if (!customerNo || !isOpen) return;
      setIsLoadingMore(true);
      try {
        const data = await getCustomerLedgerEntriesForDialog({
          customerNo,
          search: debouncedSearchRef.current || undefined,
          skip: currentLength,
          top: PAGE_SIZE,
          sortColumn: sortColumnRef.current,
          sortDirection: sortDirectionRef.current,
          filters: columnFiltersRef.current,
          visibleColumns: visibleCols,
        });
        setEntries((prev) => {
          const seen = new Set(prev.map((e) => e.Entry_No));
          return [...prev, ...data.value.filter((e) => !seen.has(e.Entry_No))];
        });
        setTotalCount(data.count);
      } catch {
        // handled in service
      } finally {
        setIsLoadingMore(false);
      }
    },
    [customerNo, isOpen],
  );

  useEffect(() => {
    if (isOpen) fetchInitial(debouncedSearch, sortColumn, sortDirection, columnFilters);
  }, [isOpen, debouncedSearch, sortColumn, sortDirection, columnFilters, fetchInitial]);

  useEffect(() => {
    if (!isOpen) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    let isFetching = false;
    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0].isIntersecting && !isFetching) {
          setEntries((prev) => {
            setTotalCount((total) => {
              const alreadyAll = total > 0 && prev.length >= total;
              if (!alreadyAll && !isFetching) {
                isFetching = true;
                fetchMore(prev.length).finally(() => { isFetching = false; });
              }
              return total;
            });
            return prev;
          });
        }
      },
      { root: scrollContainerRef.current, rootMargin: "100px", threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isOpen, fetchMore]);

  const displayList = useMemo(() => {
    const selected = Array.from(selectedEntryMap.values());
    const unselected = entries.filter((e) => !selectedEntryMap.has(e.Entry_No));
    return [...selected, ...unselected];
  }, [entries, selectedEntryMap]);

  const toggleSelect = (entry: CustomerLedgerEntry) => {
    setSelectedEntryMap((prev) => {
      const next = new Map(prev);
      if (next.has(entry.Entry_No)) next.delete(entry.Entry_No);
      else next.set(entry.Entry_No, entry);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedEntryMap(new Map());
    } else {
      const next = new Map(selectedEntryMap);
      entries.forEach((e) => next.set(e.Entry_No, e));
      setSelectedEntryMap(next);
    }
  };

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDirection === "asc") setSortDirection("desc");
      else { setSortColumn(null); setSortDirection(null); }
    } else {
      setSortColumn(colId);
      setSortDirection("asc");
    }
  };

  const handleFilter = (colId: string, value: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!value) delete next[colId];
      else next[colId] = value;
      return next;
    });
  };

  const handleApply = async () => {
    const selectedArray = Array.from(selectedEntryMap.values());
    if (selectedArray.length === 0) return;
    setIsApplying(true);
    try {
      for (const entry of selectedArray) {
        await applyCustomerLedgerEntry(documentNo, entry.Entry_No);
      }
      toast.success(`Successfully applied ${selectedArray.length} entries.`);
      setIsOpen(false);
      setSelectedEntryMap(new Map());
      onSuccess();
    } catch {
      toast.error("Failed to apply some entries.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled || !customerNo}>
          Apply Entries
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex h-[88vh] flex-col gap-0 p-0"
        style={{ width: "min(1160px, 92vw)", maxWidth: "none" }}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-3.5">
          <div className="flex w-full items-center justify-between">
            <DialogTitle className="text-[15px] font-semibold">
              Apply Customer Ledger Entries
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="bg-muted/30 flex shrink-0 items-center border-b px-5 py-2.5">
          <div className="relative w-75">
            <Input
              placeholder="Search all columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border/60 bg-background h-9 rounded-md text-sm shadow-none focus-visible:ring-1"
              autoFocus
            />
          </div>
        </div>

        <div ref={scrollContainerRef} className="bg-background min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 border-b shadow-sm">
              <tr>
                <th className="bg-muted m-0 w-10 border-b px-3 text-center align-middle">
                  <Checkbox
                    checked={entries.length > 0 && entries.every((e) => selectedEntryMap.has(e.Entry_No))}
                    onCheckedChange={toggleAll}
                  />
                </th>
                {COLUMNS.map((col) => (
                  <CustomerTableHead
                    key={col.id}
                    column={col}
                    isActive={sortColumn === col.id}
                    sortDirection={sortDirection}
                    filterValue={columnFilters[col.id] || ""}
                    onSort={handleSort}
                    onFilter={handleFilter}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="h-24 text-center">
                    <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : displayList.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="text-muted-foreground h-24 text-center">
                    No entries found.
                  </td>
                </tr>
              ) : (
                <>
                  {displayList.map((entry, idx) => {
                    const isSelected = selectedEntryMap.has(entry.Entry_No);
                    return (
                      <tr
                        key={entry.Entry_No}
                        className={cn(
                          "group cursor-pointer border-b transition-colors",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                          "hover:bg-primary/5",
                          isSelected && "bg-primary/10",
                        )}
                        onClick={() => toggleSelect(entry)}
                      >
                        <td className="w-10 px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(entry)}
                            className="translate-y-0.5"
                          />
                        </td>
                        <td className={cn("px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap", isSelected ? "text-primary" : "text-foreground")}>
                          {entry.Entry_No || <span className="opacity-30">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-sm">{entry.External_Document_No || <span className="opacity-30">—</span>}</td>
                        <td className="px-3 py-2.5 text-sm font-medium">{entry.Document_No || <span className="opacity-30">—</span>}</td>
                        <td className="px-3 py-2.5 text-sm">{entry.Document_Type || <span className="opacity-30">—</span>}</td>
                        <td className="px-3 py-2.5 text-sm whitespace-nowrap tabular-nums">{entry.Posting_Date || <span className="opacity-30">—</span>}</td>
                        <td className="px-3 py-2.5 text-sm font-medium whitespace-nowrap tabular-nums">{entry.Original_Amount ?? <span className="opacity-30">—</span>}</td>
                        <td className="px-3 py-2.5 text-sm font-medium whitespace-nowrap tabular-nums">{entry.Remaining_Amount ?? <span className="opacity-30">—</span>}</td>
                      </tr>
                    );
                  })}
                  <tr ref={sentinelRef} className="m-0 h-1 border-0 bg-transparent p-0 text-transparent hover:bg-transparent">
                    <td colSpan={COLUMNS.length + 1} className="border-0 p-0">
                      {isLoadingMore && (
                        <div className="flex justify-center p-4">
                          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                        </div>
                      )}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-muted/10 flex shrink-0 items-center justify-between border-t px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground bg-muted rounded px-2 py-1 text-xs">{totalCount} total entries</span>
            <span className="bg-primary/10 text-primary border-primary/20 rounded border px-2 py-1 text-xs font-semibold">{selectedEntryMap.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={selectedEntryMap.size === 0 || isApplying} size="sm" className="h-8">
              {isApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Apply Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CustomerTableHeadProps {
  column: ColConfig;
  isActive: boolean;
  sortDirection: SortDir;
  filterValue: string;
  onSort: (id: string) => void;
  onFilter: (id: string, val: string) => void;
}

function CustomerTableHead({ column, isActive, sortDirection, filterValue, onSort, onFilter }: CustomerTableHeadProps) {
  const getSortIcon = () => {
    if (!isActive || !sortDirection) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    if (sortDirection === "asc") return <ArrowUp className="h-3 w-3" />;
    return <ArrowDown className="h-3 w-3" />;
  };

  return (
    <th
      className={cn(
        "text-foreground bg-muted h-10 border-b px-2 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none",
        isActive ? "text-primary" : "",
      )}
      style={column.width ? { width: column.width, minWidth: column.width } : undefined}
    >
      <div className="flex items-center gap-1.5">
        <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => column.sortable && onSort(column.id)}>
          {column.label}
        </span>
        {column.sortable && (
          <button type="button" className="hover:text-primary transition-colors" onClick={() => onSort(column.id)}>
            {getSortIcon()}
          </button>
        )}
        {column.filterType && (
          <CustomerColFilter column={column} value={filterValue} onChange={(v) => onFilter(column.id, v)} />
        )}
      </div>
    </th>
  );
}

function CustomerColFilter({ column, value, onChange }: { column: ColConfig; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button type="button" className={cn("hover:text-primary ml-auto transition-colors", value ? "text-primary" : "text-muted-foreground")}>
          <Filter className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Filter {column.label}</h4>
          <Input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Search..."
            className="h-8"
            onKeyDown={(e) => { if (e.key === "Enter") { onChange(local); setOpen(false); } }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setLocal(""); onChange(""); setOpen(false); }}>Clear</Button>
            <Button size="sm" onClick={() => { onChange(local); setOpen(false); }}>
              <Check className="mr-1 h-4 w-4" /> Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
