"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
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
import { ALL_COLUMNS } from "./column-config";
import type { FilterCondition } from "./types";

interface DynamicFilterBuilderProps {
  filters: FilterCondition[];
  onAddFilter: (filter: FilterCondition) => void;
  onRemoveFilter: (index: number) => void;
}

const EXCLUDED_FIELDS = ["Location_Code", "Item_No", "Posting_Date"];
const AVAILABLE_COLUMNS = ALL_COLUMNS.filter(
  (col) => !EXCLUDED_FIELDS.includes(col.id),
).sort((a, b) => a.label.localeCompare(b.label));

export function DynamicFilterBuilder({
  filters,
  onAddFilter,
  onRemoveFilter,
}: DynamicFilterBuilderProps) {
  const [open, setOpen] = useState(false);
  const [selectedField, setSelectedField] = useState("");
  const [operator, setOperator] = useState<FilterCondition["operator"]>("eq");
  const [value, setValue] = useState("");

  const selectedCol = AVAILABLE_COLUMNS.find((c) => c.id === selectedField);

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
    if (selectedCol.filterType === "boolean") {
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger>
            <SelectValue placeholder="Select Yes/No" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
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
              <Select
                value={selectedField}
                onValueChange={(v) => {
                  setSelectedField(v);
                  setOperator("eq");
                  setValue("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a field..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {AVAILABLE_COLUMNS.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              AVAILABLE_COLUMNS.find((c) => c.id === f.field)?.label || f.field;
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
