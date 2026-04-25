"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  ChevronDownIcon,
  Search,
  X,
  Check,
  MapPin,
  Columns,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getLocationsByBranch,
  type LocationItem,
} from "@/lib/api/services/location.service";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocationCodeSelectDialogProps {
  value: string;
  onChange: (value: string, item?: LocationItem) => void;
  branchCode: string;
  disabled?: boolean;
  readOnly?: boolean;
  hasError?: boolean;
  className?: string;
  placeholder?: string;
}

type SortDirection = "asc" | "desc";

interface ColumnConfig {
  id: keyof LocationItem;
  label: string;
  width?: string;
  flex?: boolean;
  sortable?: boolean;
  optional?: boolean;
  render?: (item: LocationItem) => React.ReactNode;
}

// ── Column definitions ────────────────────────────────────────────────────────

const MANDATORY_COLUMNS: ColumnConfig[] = [
  { id: "Code", label: "Code", width: "120px", sortable: true },
  { id: "Name", label: "Name", flex: true, sortable: true },
  { id: "Address", label: "Address", width: "180px", sortable: true },
  { id: "City", label: "City", width: "110px", sortable: true },
];

const OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Post_Code", label: "Post Code", width: "90px", sortable: true, optional: true },
  { id: "State_Code", label: "State", width: "70px", sortable: true, optional: true },
  { id: "GST_Registration_No", label: "GST Reg. No", width: "150px", sortable: true, optional: true },
  { id: "Phone_No", label: "Phone No", width: "120px", sortable: true, optional: true },
  { id: "Responsibility_Center", label: "Resp. Center", width: "110px", sortable: true, optional: true },
  { id: "Region_Code", label: "Region", width: "80px", sortable: true, optional: true },
  { id: "Global_Dimension_1_Code", label: "LOB", width: "80px", sortable: true, optional: true },
  { id: "Farm_Type", label: "Farm Type", width: "90px", sortable: true, optional: true },
  { id: "Shed_Type", label: "Shed Type", width: "90px", sortable: true, optional: true },
  { id: "Grade", label: "Grade", width: "70px", sortable: true, optional: true },
  {
    id: "Block",
    label: "Blocked",
    width: "75px",
    optional: true,
    render: (item) =>
      item.Block ? (
        <span className="rounded-sm bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
          Yes
        </span>
      ) : (
        <span className="text-muted-foreground text-[11px]">—</span>
      ),
  },
  {
    id: "Farmer",
    label: "Farmer",
    width: "70px",
    optional: true,
    render: (item) =>
      item.Farmer ? (
        <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          Yes
        </span>
      ) : (
        <span className="text-muted-foreground text-[11px]">—</span>
      ),
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

export function LocationCodeSelectDialog({
  value,
  onChange,
  branchCode,
  disabled = false,
  readOnly = false,
  hasError = false,
  className,
  placeholder = "Select Location",
}: LocationCodeSelectDialogProps) {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof LocationItem>("Code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [visibleOptional, setVisibleOptional] = useState<Set<string>>(new Set());
  const [columnPopoverOpen, setColumnPopoverOpen] = useState(false);

  const selectedItemRef = useRef<LocationItem | undefined>(undefined);

  const isDisabled = disabled || readOnly;
  const noBranch = !branchCode;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch locations when dialog opens or branchCode changes
  const fetchLocations = useCallback(async () => {
    if (!branchCode) {
      setLocations([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getLocationsByBranch(branchCode);
      setLocations(data);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [branchCode]);

  useEffect(() => {
    if (open) fetchLocations();
  }, [open, fetchLocations]);

  // Clear value when branchCode changes (handled by parent, but clear display ref too)
  useEffect(() => {
    selectedItemRef.current = undefined;
  }, [branchCode]);

  const handleOpenChange = (newOpen: boolean) => {
    if (isDisabled || noBranch) return;
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery("");
      setColumnPopoverOpen(false);
    }
  };

  const handleSelect = (item: LocationItem) => {
    selectedItemRef.current = item;
    onChange(item.Code, item);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectedItemRef.current = undefined;
    onChange("", undefined);
  };

  const handleSort = (col: keyof LocationItem) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const toggleOptionalColumn = (id: string) => {
    setVisibleOptional((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build active columns list
  const activeColumns: ColumnConfig[] = [
    ...MANDATORY_COLUMNS,
    ...OPTIONAL_COLUMNS.filter((c) => visibleOptional.has(c.id as string)),
  ];

  // Filter + sort
  const filtered = locations
    .filter((loc) => {
      if (!debouncedSearch) return true;
      const q = debouncedSearch.toLowerCase();
      return (
        loc.Code?.toLowerCase().includes(q) ||
        loc.Name?.toLowerCase().includes(q) ||
        loc.City?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aVal = String(a[sortColumn] ?? "");
      const bVal = String(b[sortColumn] ?? "");
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

  // Find selected item for display
  const selectedItem =
    locations.find((l) => l.Code === value) ?? selectedItemRef.current;

  const triggerDisabled = isDisabled || noBranch;

  return (
    <>
      {/* Trigger button + selected location name */}
      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          onClick={() => !triggerDisabled && setOpen(true)}
          disabled={triggerDisabled}
          className={cn(
            "h-9 w-full justify-between px-3 text-left font-normal",
            !value && "text-muted-foreground",
            hasError && "border-destructive/50 ring-1 ring-destructive/20",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono font-semibold">
              {noBranch && !isDisabled
                ? "Select Branch first"
                : value || placeholder}
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            {value && !isDisabled && (
              <div
                role="button"
                tabIndex={0}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e as unknown as React.MouseEvent);
                }}
              >
                <X className="h-3 w-3" />
              </div>
            )}
            <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-40" />
          </div>
        </Button>
        {selectedItem?.Name && (
          <p className="text-muted-foreground text-xs">{selectedItem.Name}</p>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex flex-col gap-0 p-0"
          style={{ width: "min(920px, 92vw)", maxWidth: "none", height: "80vh" }}
        >
          {/* Header */}
          <DialogHeader className="shrink-0 border-b px-5 py-3">
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <DialogTitle className="text-[15px] font-semibold">
                Select Location
              </DialogTitle>
              {!loading && locations.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 rounded-sm px-1.5 text-[10px] font-bold"
                >
                  {filtered.length !== locations.length
                    ? `${filtered.length} / ${locations.length}`
                    : locations.length}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Selected location - sticky */}
          {selectedItem && (
            <div className="sticky top-0 z-20 border-b bg-primary/5 px-5 py-2.5">
              <p className="text-xs font-medium">
                Selected: <span className="font-mono font-semibold">{selectedItem.Code}</span>
                {selectedItem.Name && (
                  <span className="text-muted-foreground"> – {selectedItem.Name}</span>
                )}
              </p>
            </div>
          )}

          {/* Search bar + Column control */}
          <div className="shrink-0 border-b bg-muted/30 px-5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by Code, Name or City…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 bg-background pl-9 pr-9 text-sm focus-visible:ring-1"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Column control */}
              <Popover open={columnPopoverOpen} onOpenChange={setColumnPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 shrink-0 text-xs"
                  >
                    <Columns className="h-3.5 w-3.5" />
                    Columns
                    {visibleOptional.size > 0 && (
                      <Badge className="h-4 min-w-4 rounded-full px-1 text-[9px]">
                        +{visibleOptional.size}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Always visible
                  </p>
                  <div className="mb-3 space-y-1.5">
                    {MANDATORY_COLUMNS.map((col) => (
                      <div key={col.id as string} className="flex items-center gap-2">
                        <Checkbox checked disabled className="h-3.5 w-3.5" />
                        <span className="text-xs text-muted-foreground">{col.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Optional
                  </p>
                  <div className="space-y-1.5">
                    {OPTIONAL_COLUMNS.map((col) => (
                      <div
                        key={col.id as string}
                        className="flex cursor-pointer items-center gap-2"
                        onClick={() => toggleOptionalColumn(col.id as string)}
                      >
                        <Checkbox
                          checked={visibleOptional.has(col.id as string)}
                          onCheckedChange={() => toggleOptionalColumn(col.id as string)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-xs">{col.label}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Table */}
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  {/* Check column */}
                  <th className="w-8 border-b px-2" />
                  {activeColumns.map((col) => (
                    <th
                      key={col.id as string}
                      className={cn(
                        "h-10 border-b px-3 py-2 text-left text-xs font-bold",
                        col.sortable && "cursor-pointer select-none hover:bg-muted/80",
                      )}
                      style={col.flex ? undefined : { width: col.width }}
                      onClick={() => col.sortable && handleSort(col.id)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortColumn === col.id && (
                          <span className="text-[10px] text-primary">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={activeColumns.length + 1}
                      className="py-20 text-center"
                    >
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeColumns.length + 1}
                      className="py-20 text-center text-sm text-muted-foreground"
                    >
                      {debouncedSearch
                        ? `No locations match "${debouncedSearch}"`
                        : "No locations found for this branch"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((loc, idx) => {
                    const isSelected = value === loc.Code;
                    return (
                      <tr
                        key={loc.Code}
                        onClick={() => handleSelect(loc)}
                        className={cn(
                          "cursor-pointer border-b transition-colors hover:bg-primary/5",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                          isSelected && "bg-primary/10 hover:bg-primary/10",
                        )}
                      >
                        <td className="w-8 px-2 py-2.5 text-center">
                          {isSelected && (
                            <Check className="mx-auto h-3.5 w-3.5 text-primary" />
                          )}
                        </td>
                        {activeColumns.map((col) => (
                          <td
                            key={col.id as string}
                            className="px-3 py-2 text-xs"
                          >
                            {col.render ? (
                              col.render(loc)
                            ) : col.id === "Code" ? (
                              <span className="font-mono font-semibold">
                                {String(loc[col.id] ?? "—")}
                              </span>
                            ) : (
                              <span className={col.id === "Name" ? "font-medium" : ""}>
                                {String(loc[col.id] ?? "") || (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <DialogFooter className="shrink-0 border-t px-5 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
