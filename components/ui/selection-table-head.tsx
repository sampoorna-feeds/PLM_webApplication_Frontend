"use client";

import { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type SortDirection = "asc" | "desc" | null;

export interface ColumnConfig {
  id: string;
  label: string;
  sortable?: boolean;
  filterType?: "text" | "number";
  align?: "left" | "right" | "center";
  width?: string;
}

export interface SelectionTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (id: string) => void;
  onFilter: (id: string, value: string) => void;
}

export function SelectionTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: SelectionTableHeadProps) {
  const SortIcon =
    !isActive || !sortDirection
      ? ArrowUpDown
      : sortDirection === "asc"
        ? ArrowUp
        : ArrowDown;
  return (
    <th
      className={cn(
        "bg-muted text-foreground h-10 px-3 text-left align-middle text-[10px] font-bold tracking-wider whitespace-nowrap uppercase select-none",
        column.align === "right" && "text-right",
        column.align === "center" && "text-center",
      )}
      style={{ minWidth: column.width }}
    >
      <div
        className={cn(
          "flex items-center gap-1",
          column.align === "right"
            ? "justify-end"
            : column.align === "center"
              ? "justify-center"
              : "",
        )}
      >
        <span
          className={cn(
            column.sortable && "cursor-pointer hover:opacity-70 transition-opacity",
          )}
          onClick={() => column.sortable && onSort(column.id)}
        >
          {column.label}
        </span>
        {column.sortable && (
          <button
            type="button"
            className="hover:opacity-70 transition-opacity flex items-center justify-center"
            onClick={() => onSort(column.id)}
          >
            <SortIcon className={cn("h-3 w-3", !isActive && "opacity-30")} />
          </button>
        )}
        {column.filterType && (
          <SelectionColumnFilter
            column={column}
            value={filterValue}
            onChange={(v) => onFilter(column.id, v)}
          />
        )}
      </div>
    </th>
  );
}

interface SelectionColumnFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
}

export function SelectionColumnFilter({
  column,
  value,
  onChange,
}: SelectionColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);
  const hasFilter = !!value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded p-0.5 transition-colors flex items-center justify-center",
            hasFilter
              ? "text-primary"
              : "text-primary/30 hover:text-primary/60",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className={cn("h-3 w-3", hasFilter && "fill-current")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label className="text-xs">Filter {column.label}</Label>
          <Input
            placeholder="Search..."
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChange(local);
                setOpen(false);
              }
            }}
          />
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => {
              onChange(local);
              setOpen(false);
            }}
          >
            Apply
          </Button>
          {hasFilter && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => {
                setLocal("");
                onChange("");
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
