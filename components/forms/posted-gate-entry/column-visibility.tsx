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
import {
  POSTED_GATE_ENTRY_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  type Column,
} from "./column-config";

interface ColumnVisibilityProps {
  visibleColumns: string[];
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
}

export function PostedGateEntryColumnVisibility({
  visibleColumns,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
}: ColumnVisibilityProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const visibleCount = visibleColumns.length;
  const totalCount = POSTED_GATE_ENTRY_COLUMNS.length;

  const defaultColumns = useMemo(() => {
    return POSTED_GATE_ENTRY_COLUMNS.filter((col) => DEFAULT_VISIBLE_COLUMNS.includes(col.id));
  }, []);

  const optionalColumns = useMemo(() => {
    return POSTED_GATE_ENTRY_COLUMNS.filter((col) => !DEFAULT_VISIBLE_COLUMNS.includes(col.id));
  }, []);

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
        <Button variant="outline" size="sm" className="gap-2 h-9 text-xs font-medium tracking-wide">
          <Settings2 className="h-4 w-4" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="border-b p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Toggle Columns</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold uppercase"
                onClick={onShowAllColumns}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold uppercase"
                onClick={onResetColumns}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            </div>
          </div>
          {/* Search bar */}
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search columns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-xs font-medium"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredDefault.length > 0 && (
            <div className="mb-2">
              <span className="text-muted-foreground px-2 text-[10px] font-bold uppercase tracking-wider">
                Default Columns
              </span>
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
            <Separator className="my-2" />
          )}

          {filteredOptional.length > 0 && (
            <div>
              <span className="text-muted-foreground px-2 text-[10px] font-bold uppercase tracking-wider">
                Additional Columns
              </span>
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
            <div className="text-muted-foreground py-4 text-center text-xs font-medium">
              No columns match &quot;{search}&quot;
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ColumnToggleItemProps {
  column: Column;
  isChecked: boolean;
  onToggle: () => void;
}

function ColumnToggleItem({
  column,
  isChecked,
  onToggle,
}: ColumnToggleItemProps) {
  return (
    <div
      className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5"
      onClick={onToggle}
    >
      <Checkbox
        checked={isChecked}
        onCheckedChange={onToggle}
        className="pointer-events-none h-3.5 w-3.5"
      />
      <span className="text-xs font-medium">{column.label}</span>
    </div>
  );
}
