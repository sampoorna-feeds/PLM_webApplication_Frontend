"use client";

import { useState, useMemo } from "react";
import { Settings2, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { type ColumnConfig } from "./vendor-ledger-column-config";

interface VendorColumnVisibilityProps {
  visibleColumns: string[];
  defaultColumns: ColumnConfig[];
  optionalColumns: ColumnConfig[];
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
}

export function VendorColumnVisibility({
  visibleColumns,
  defaultColumns,
  optionalColumns,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
}: VendorColumnVisibilityProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Count visible columns
  const visibleCount = visibleColumns.length;
  const totalCount = defaultColumns.length + optionalColumns.length;

  // Filter columns by search
  const filteredDefault = useMemo(() => {
    if (!search.trim()) return defaultColumns;
    const q = search.toLowerCase();
    return defaultColumns.filter(
      (col) =>
        col.label.toLowerCase().includes(q) || col.id.toLowerCase().includes(q),
    );
  }, [search, defaultColumns]);

  const filteredOptional = useMemo(() => {
    if (!search.trim()) return optionalColumns;
    const q = search.toLowerCase();
    return optionalColumns.filter(
      (col) =>
        col.label.toLowerCase().includes(q) || col.id.toLowerCase().includes(q),
    );
  }, [search, optionalColumns]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9 border shadow-sm hover:bg-muted font-medium">
          <Settings2 className="h-4 w-4" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 shadow-lg border-primary/10" align="end">
        <div className="border-b p-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Toggle Columns</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold uppercase hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={onShowAllColumns}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold uppercase hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={onResetColumns}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            </div>
          </div>
          {/* Search bar */}
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search columns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-background/50"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
          {/* Default columns */}
          {filteredDefault.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                  Default Columns
                </span>
              </div>
              {filteredDefault.map((column) => (
                <ColumnToggleItem
                  key={column.id}
                  column={column}
                  isChecked={visibleColumns.includes(column.id)}
                  onToggle={() => onColumnToggle(column.id)}
                />
              ))}
            </div>
          )}

          {filteredDefault.length > 0 && filteredOptional.length > 0 && (
            <Separator className="my-2 opacity-50" />
          )}

          {/* Optional columns */}
          {filteredOptional.length > 0 && (
            <div>
              <div className="px-2 py-1 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">
                  Additional Columns
                </span>
              </div>
              {filteredOptional.map((column) => (
                <ColumnToggleItem
                  key={column.id}
                  column={column}
                  isChecked={visibleColumns.includes(column.id)}
                  onToggle={() => onColumnToggle(column.id)}
                />
              ))}
            </div>
          )}

          {filteredDefault.length === 0 && filteredOptional.length === 0 && (
            <div className="text-muted-foreground py-8 text-center text-xs italic">
              No columns match &quot;{search}&quot;
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ColumnToggleItemProps {
  column: ColumnConfig;
  isChecked: boolean;
  onToggle: () => void;
}

function ColumnToggleItem({
  column,
  isChecked,
  onToggle,
}: ColumnToggleItemProps) {
  return (
    <div className="hover:bg-muted/50 flex items-center space-x-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer group">
      <Checkbox
        id={`column-${column.id}`}
        checked={isChecked}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <label
        htmlFor={`column-${column.id}`}
        className="flex-1 cursor-pointer text-xs font-medium leading-none group-hover:text-primary transition-colors"
      >
        {column.label}
      </label>
    </div>
  );
}
