"use client";

import { useState, useMemo } from "react";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_COLUMNS } from "./column-config";
import type { FilterCondition } from "./types";

interface DynamicFilterBuilderProps {
  filters: FilterCondition[];
  onAddFilter: (filter: FilterCondition) => void;
  onRemoveFilter: (index: number) => void;
  /** Exclude specific columns from being selectable in the builder */
  excludeColumns?: string[];
}

export function DynamicFilterBuilder({
  filters,
  onAddFilter,
  onRemoveFilter,
  excludeColumns = [],
}: DynamicFilterBuilderProps) {
  const [open, setOpen] = useState(false);
  const [selectedField, setSelectedField] = useState("");
  const [operator, setOperator] =
    useState<FilterCondition["operator"]>("contains");
  const [value, setValue] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");

  // Only show columns that are not excluded and not the base dimension codes (LOB, Branch, etc. are handled by global tabs/filters usually)
  const availableColumns = useMemo(() => {
    return ALL_COLUMNS.filter(
      (col) =>
        !excludeColumns.includes(col.id) &&
        !["Shortcut_Dimension_1_Code", "Shortcut_Dimension_2_Code"].includes(
          col.id,
        ),
    ).sort((a, b) => a.label.localeCompare(b.label));
  }, [excludeColumns]);

  // Filter columns by search query (matches label or id)
  const filteredColumns = useMemo(() => {
    if (!fieldSearch.trim()) return availableColumns;
    const q = fieldSearch.toLowerCase();
    return availableColumns.filter(
      (col) =>
        col.label.toLowerCase().includes(q) || col.id.toLowerCase().includes(q),
    );
  }, [fieldSearch, availableColumns]);

  const selectedCol = availableColumns.find((c) => c.id === selectedField);

  const handleAdd = () => {
    if (!selectedField || !value.trim()) return;
    onAddFilter({
      field: selectedField,
      operator,
      value: value.trim(),
      type: selectedCol?.filterType || "text",
    });
    setOpen(false);
    setSelectedField("");
    setValue("");
  };

  const renderOperatorSelect = () => {
    if (!selectedCol) return null;
    const type = selectedCol.filterType;

    return (
      <Select value={operator} onValueChange={(v: any) => setOperator(v)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="eq" className="text-xs">Equals</SelectItem>
          <SelectItem value="ne" className="text-xs">Not Equals</SelectItem>
          {(type === "number" || type === "date") && (
            <>
              <SelectItem value="gt" className="text-xs">Greater Than</SelectItem>
              <SelectItem value="ge" className="text-xs">Greater or Equal</SelectItem>
              <SelectItem value="lt" className="text-xs">Less Than</SelectItem>
              <SelectItem value="le" className="text-xs">Less or Equal</SelectItem>
            </>
          )}
          {type === "text" && (
            <>
              <SelectItem value="contains" className="text-xs">Contains</SelectItem>
              <SelectItem value="startswith" className="text-xs">Starts With</SelectItem>
              <SelectItem value="endswith" className="text-xs">Ends With</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    );
  };

  const renderValueInput = () => {
    if (!selectedCol) return null;
    if (
      selectedCol.filterType === "boolean" ||
      selectedCol.filterType === "enum"
    ) {
      // In a more complex version, "enum" would read options from col.filterOptions
      // Here we just fall back to text if it's enum, or Yes/No for boolean
      if (selectedCol.filterType === "boolean") {
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select Yes/No" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true" className="text-xs">Yes</SelectItem>
              <SelectItem value="false" className="text-xs">No</SelectItem>
            </SelectContent>
          </Select>
        );
      }
    }

    return (
      <Input
        type={
          selectedCol.filterType === "number"
            ? "number"
            : selectedCol.filterType === "date"
              ? "date"
              : "text"
        }
        placeholder="Value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 text-xs"
      />
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1.5 border-dashed hover:bg-accent hover:text-accent-foreground">
            <Plus className="h-3.5 w-3.5" />
            Add Filter
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[280px] sm:max-w-[320px] p-3.5 gap-3" showCloseButton={true}>
          <DialogHeader className="gap-0.5">
            <DialogTitle className="text-sm font-semibold">Add Filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Field</Label>
              {/* Show selected field badge */}
              {selectedCol && (
                <div className="bg-primary/5 text-primary border border-primary/10 flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium">
                  <Check className="text-primary h-3.5 w-3.5" />
                  <span className="truncate max-w-[180px]">{selectedCol.label}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedField("")}
                    className="text-muted-foreground hover:text-foreground ml-auto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <Input
                placeholder="Search fields..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="h-7 text-xs px-2"
              />
              <div className="max-h-32 overflow-y-auto rounded border border-border/60 bg-muted/20">
                {filteredColumns.length === 0 ? (
                  <div className="text-muted-foreground p-2 text-center text-xs">
                    No fields match
                  </div>
                ) : (
                  filteredColumns.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        setSelectedField(col.id);
                        setOperator(
                          col.filterType === "text" || col.filterType === "enum"
                            ? "contains"
                            : "eq",
                        );
                        setValue("");
                        setFieldSearch("");
                      }}
                      className={`hover:bg-accent/80 hover:text-accent-foreground w-full px-2 py-1 text-left text-xs transition-colors ${
                        selectedField === col.id ? "bg-accent font-medium text-accent-foreground" : ""
                      }`}
                    >
                      {col.label}
                    </button>
                  ))
                )}
              </div>
            </div>
            {selectedField && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Operator</Label>
                  {renderOperatorSelect()}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">Value</Label>
                  {renderValueInput()}
                </div>
                <Button
                  className="w-full h-8 text-xs font-semibold shadow-sm"
                  onClick={handleAdd}
                  disabled={!value.trim()}
                >
                  Apply Filter
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {filters.length > 0 && (
        <div className="ml-2 flex flex-wrap items-center gap-1.5">
          {filters.map((f, i) => {
            const colLabel =
              availableColumns.find((c) => c.id === f.field)?.label || f.field;
            return (
              <div
                key={i}
                className="bg-muted/40 hover:bg-muted/60 flex items-center gap-1.5 rounded border border-border/50 py-0.5 pr-0.5 pl-2 text-[11px] text-muted-foreground transition-all duration-200"
              >
                <span className="font-medium text-foreground">{colLabel}</span>
                <span className="text-[10px] text-muted-foreground/80 font-mono lowercase">{f.operator}</span>
                <span className="font-semibold text-primary bg-primary/5 px-1 py-0.5 rounded text-[10px] border border-primary/10">
                  {f.value}
                </span>
                <button
                  onClick={() => onRemoveFilter(i)}
                  className="hover:bg-destructive hover:text-destructive-foreground ml-0.5 rounded p-0.5 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
