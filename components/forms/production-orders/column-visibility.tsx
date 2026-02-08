"use client";

import { useState } from "react";
import { Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

  // Count visible columns
  const visibleCount = visibleColumns.length;
  const totalCount = DEFAULT_COLUMNS.length + OPTIONAL_COLUMNS.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
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
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {/* Default columns */}
          <div className="mb-2">
            <span className="text-muted-foreground px-2 text-xs">
              Default Columns
            </span>
            {DEFAULT_COLUMNS.map((column) => (
              <ColumnToggleItem
                key={column.id}
                column={column}
                isChecked={visibleColumns.includes(column.id)}
                onToggle={() => onColumnToggle(column.id)}
              />
            ))}
          </div>

          <Separator className="my-2" />

          {/* Optional columns */}
          <div>
            <span className="text-muted-foreground px-2 text-xs">
              Additional Columns
            </span>
            {OPTIONAL_COLUMNS.map((column) => (
              <ColumnToggleItem
                key={column.id}
                column={column}
                isChecked={visibleColumns.includes(column.id)}
                onToggle={() => onColumnToggle(column.id)}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ColumnToggleItemProps {
  column: ColumnConfig;
  isChecked: boolean;
  isDisabled?: boolean;
  onToggle: () => void;
}

function ColumnToggleItem({
  column,
  isChecked,
  isDisabled = false,
  onToggle,
}: ColumnToggleItemProps) {
  return (
    <div
      className={`hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 ${
        isDisabled ? "cursor-not-allowed opacity-60" : ""
      }`}
      onClick={() => !isDisabled && onToggle()}
    >
      <Checkbox
        checked={isChecked}
        disabled={isDisabled}
        onCheckedChange={() => !isDisabled && onToggle()}
        className="pointer-events-none"
      />
      <span className="text-sm">{column.label}</span>
    </div>
  );
}
