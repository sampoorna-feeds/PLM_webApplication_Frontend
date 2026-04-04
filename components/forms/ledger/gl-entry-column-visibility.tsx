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
import { type ColumnConfig, ALL_COLUMNS } from "./gl-entry-column-config";

interface GLEntryColumnVisibilityProps {
  visibleColumns: string[];
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
}

export function GLEntryColumnVisibility({
  visibleColumns,
  onColumnToggle,
  onResetColumns,
}: GLEntryColumnVisibilityProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const visibleCount = visibleColumns.length;
  const totalCount = ALL_COLUMNS.length;

  const filteredColumns = useMemo(() => {
    if (!search.trim()) return ALL_COLUMNS;
    const q = search.toLowerCase();
    return ALL_COLUMNS.filter(
      (col) =>
        col.label.toLowerCase().includes(q) || col.id.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 px-5 border-border/50 bg-background/40 hover:bg-background/60 shadow-sm rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest transition-all">
          <Settings2 className="h-4 w-4" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 shadow-2xl border-border/50 rounded-2xl overflow-hidden" align="end">
        <div className="border-b p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 leading-none">Layout</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-colors"
              onClick={onResetColumns}
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Reset
            </Button>
          </div>
          <div className="relative">
            <Search className="text-muted-foreground/60 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search columns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs bg-background/50 border-border/50 rounded-lg focus:border-primary/40 focus:ring-primary/10 transition-all"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
          {filteredColumns.map((column) => (
            <div 
              key={column.id}
              className="hover:bg-muted/50 flex items-center space-x-3 rounded-xl px-3 py-2.5 transition-all cursor-pointer group"
              onClick={() => onColumnToggle(column.id)}
            >
              <Checkbox
                id={`gl-col-${column.id}`}
                checked={visibleColumns.includes(column.id)}
                onCheckedChange={() => onColumnToggle(column.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-[4px]"
              />
              <label
                className="flex-1 cursor-pointer text-xs font-bold leading-none text-foreground/70 group-hover:text-primary transition-colors"
              >
                {column.label}
              </label>
            </div>
          ))}
          
          {filteredColumns.length === 0 && (
            <div className="text-muted-foreground py-10 text-center text-[10px] font-black uppercase tracking-widest italic opacity-50">
              No Matches
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
