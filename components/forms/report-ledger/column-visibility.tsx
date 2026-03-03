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
  DEFAULT_COLUMNS,
  OPTIONAL_COLUMNS,
  type ColumnConfig,
} from "./column-config";

interface ColumnVisibilityProps {
  visibleColumns: string[];
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
}

export function ColumnVisibility({
  visibleColumns,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
}: ColumnVisibilityProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Count visible columns
  const visibleCount = visibleColumns.length;
  const totalCount = DEFAULT_COLUMNS.length + OPTIONAL_COLUMNS.length;

  // Filter columns by search
  const filteredDefault = useMemo(() => {
    if (!search.trim()) return DEFAULT_COLUMNS;
    const q = search.toLowerCase();
    return DEFAULT_COLUMNS.filter(
      (col) =>
        col.label.toLowerCase().includes(q) || col.id.toLowerCase().includes(q),
    );
  }, [search]);

  const filteredOptional = useMemo(() => {
    if (!search.trim()) return OPTIONAL_COLUMNS;
    const q = search.toLowerCase();
    return OPTIONAL_COLUMNS.filter(
      (col) =>
        col.label.toLowerCase().includes(q) || col.id.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="border-b p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Toggle Columns</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onShowAllColumns}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
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
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {/* Default columns */}
          {filteredDefault.length > 0 && (
            <div className="mb-2">
              <span className="text-muted-foreground px-2 text-xs">
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

          {/* Optional columns */}
          {filteredOptional.length > 0 && (
            <div>
              <span className="text-muted-foreground px-2 text-xs">
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
            <div className="text-muted-foreground py-4 text-center text-sm">
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
    <div className="hover:bg-accent flex items-center space-x-2 rounded-sm px-2 py-1.5">
      <Checkbox
        id={`column-${column.id}`}
        checked={isChecked}
        onCheckedChange={onToggle}
      />
      <label
        htmlFor={`column-${column.id}`}
        className="flex-1 cursor-pointer text-sm leading-none font-normal"
      >
        {column.label}
      </label>
    </div>
  );
}
