"use client";

import { useState, useMemo } from "react";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnConfig } from "./column-config";
import type { FilterCondition } from "./types";

// Exclude fields that are already handled by the primary filter bar
const EXCLUDED_FIELDS = ["Shortcut_Dimension_2_Code", "Status"];

interface DynamicFilterBuilderProps {
  filters: FilterCondition[];
  allColumns: ColumnConfig[];
  onAddFilter: (filter: FilterCondition) => void;
  onRemoveFilter: (index: number) => void;
}

export function DynamicFilterBuilder({
  filters,
  allColumns,
  onAddFilter,
  onRemoveFilter,
}: DynamicFilterBuilderProps) {
  const [open, setOpen] = useState(false);
  const [selectedField, setSelectedField] = useState("");
  const [operator, setOperator] =
    useState<FilterCondition["operator"]>("contains");
  const [value, setValue] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");

  const availableColumns = useMemo(
    () =>
      allColumns
        .filter((col) => !EXCLUDED_FIELDS.includes(col.id))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [allColumns],
  );

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
        <SelectTrigger>
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="eq">Equals</SelectItem>
          <SelectItem value="ne">Not Equals</SelectItem>
          {(type === "number" || type === "date") && (
            <>
              <SelectItem value="gt">Greater Than</SelectItem>
              <SelectItem value="ge">Greater or Equal</SelectItem>
              <SelectItem value="lt">Less Than</SelectItem>
              <SelectItem value="le">Less or Equal</SelectItem>
            </>
          )}
          {type === "text" && (
            <>
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="startswith">Starts With</SelectItem>
              <SelectItem value="endswith">Ends With</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    );
  };

  const renderValueInput = () => {
    if (!selectedCol) return null;
    if (selectedCol.filterType === "enum") {
      return (
        <Input
          type="text"
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      );
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
      />
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 border-dashed">
            <Plus className="h-4 w-4" />
            Add Filter
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Field</Label>
              {/* Show selected field badge */}
              {selectedCol && (
                <div className="bg-accent flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium">
                  <Check className="text-primary h-3.5 w-3.5" />
                  {selectedCol.label}
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
                className="h-8 text-sm"
              />
              <div className="max-h-48 overflow-y-auto rounded border">
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
                        const colDef = availableColumns.find(
                          (c) => c.id === col.id,
                        );
                        setOperator(
                          colDef?.filterType === "text" ? "contains" : "eq",
                        );
                        setValue("");
                        setFieldSearch("");
                      }}
                      className={`hover:bg-accent w-full px-3 py-1.5 text-left text-sm transition-colors ${
                        selectedField === col.id ? "bg-accent font-medium" : ""
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
                <div className="space-y-2">
                  <Label>Operator</Label>
                  {renderOperatorSelect()}
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  {renderValueInput()}
                </div>
                <Button
                  className="w-full"
                  onClick={handleAdd}
                  disabled={!value.trim()}
                >
                  Apply Filter
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {filters.length > 0 && (
        <div className="ml-2 flex flex-wrap items-center gap-2">
          {filters.map((f, i) => {
            const colLabel =
              availableColumns.find((c) => c.id === f.field)?.label || f.field;
            return (
              <div
                key={i}
                className="bg-muted/50 flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-xs"
              >
                <span className="font-medium">{colLabel}</span>
                <span className="text-muted-foreground">{f.operator}</span>
                <span className="font-semibold">{f.value}</span>
                <button
                  onClick={() => onRemoveFilter(i)}
                  className="hover:bg-muted ml-1 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
