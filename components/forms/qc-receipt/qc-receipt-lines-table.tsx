"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { QCReceiptLine } from "@/lib/api/services/qc-receipt.service";
import { Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { useQCReceiptLineUpdate } from "./use-qc-receipts";

interface QCReceiptLinesTableProps {
  lines: QCReceiptLine[];
  isLoading: boolean;
  onUpdate?: (index: number, updatedLine: QCReceiptLine) => void;
  isReadOnly?: boolean;
}

export function QCReceiptLinesTable({
  lines,
  isLoading,
  onUpdate,
  isReadOnly = false,
}: QCReceiptLinesTableProps) {
  const [isUpdatingLine, setIsUpdatingLine] = useState<number | null>(null);
  const { updateLine } = useQCReceiptLineUpdate();
  const tableRef = useRef<HTMLTableElement>(null);

  const handleCellSave = async (index: number, field: string, value: any) => {
    if (isReadOnly) return;
    const line = lines[index];
    
    // Don't save if value hasn't changed
    const currentValue = (line as any)[field];
    if (currentValue === value || (currentValue === null && value === "")) return;

    setIsUpdatingLine(index);
    try {
      const result = await updateLine(line.No, line.Line_No, line["@odata.etag"] || "*", {
        [field]: value,
      });
      if (result) {
        onUpdate?.(index, result);
      }
    } finally {
      setIsUpdatingLine(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, field: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      // Save current cell value
      const value = field === "Actual_Value" ? Number(e.currentTarget.value) : e.currentTarget.value;
      handleCellSave(index, field, value);

      // Focus next row's cell in same column
      const nextRow = index + 1;
      if (nextRow < lines.length) {
        const nextInput = tableRef.current?.querySelector(
          `input[data-row="${nextRow}"][data-field="${field}"]`
        ) as HTMLInputElement;
        
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full caption-bottom text-sm border-collapse">
          <thead className="bg-muted sticky top-0 z-10 border-b">
            <tr className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <th className="h-10 px-3 py-3 text-left">Description</th>
              <th className="h-10 px-3 py-3 text-left">Type</th>
              <th className="h-10 px-3 py-3 text-left">UOM</th>
              <th className="h-10 px-3 py-3 text-right">Min</th>
              <th className="h-10 px-3 py-3 text-right">Max</th>
              <th className="h-10 px-3 py-3 text-right">Text Value</th>
              <th className="h-10 px-3 py-3 text-right w-[120px]">Actual Value</th>
              <th className="h-10 px-3 py-3 text-left w-[180px]">Actual Text</th>
              <th className="h-10 px-3 py-3 text-right text-[9px] leading-tight">Dev %</th>
              <th className="h-10 px-3 py-3 text-right text-[9px] leading-tight">Max Dev</th>
              <th className="h-10 px-3 py-3 text-center text-[9px]">Rej</th>
              <th className="h-10 px-3 py-3 text-right text-[9px]">Rej Qty</th>
              <th className="h-10 px-3 py-3 text-center text-[9px]">Mand</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0 text-[11px]">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="border-b">
                  {Array.from({ length: 13 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="p-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-muted-foreground h-24 text-center align-middle">
                  No line items found.
                </td>
              </tr>
            ) : (
              lines.map((line, index) => (
                <tr key={`${line.No}-${line.Line_No}-${index}`} className="border-b transition-colors hover:bg-muted/30 group">
                  <td className="p-3 align-middle whitespace-nowrap font-medium text-foreground/80">{line.Description || "-"}</td>
                  <td className="p-3 align-middle whitespace-nowrap text-muted-foreground">{line.Type || "-"}</td>
                  <td className="p-3 align-middle whitespace-nowrap text-muted-foreground">{line.Unit_of_Measure_Code || "-"}</td>
                  <td className="p-3 align-middle text-right whitespace-nowrap text-muted-foreground/70">{line.Min_Value}</td>
                  <td className="p-3 align-middle text-right whitespace-nowrap text-muted-foreground/70">{line.Max_Value}</td>
                  <td className="p-3 align-middle text-right whitespace-nowrap text-muted-foreground/70">{line.Text_Value || "-"}</td>
                  
                  {/* EDITABLE COLUMN: Actual Value */}
                  <td className="p-0 border-x border-dashed border-muted-foreground/20 bg-primary/5 group-hover:bg-primary/10 transition-colors">
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        defaultValue={line.Actual_Value}
                        data-row={index}
                        data-field="Actual_Value"
                        disabled={isReadOnly || (isUpdatingLine === index)}
                        onBlur={(e) => handleCellSave(index, "Actual_Value", Number(e.target.value))}
                        onKeyDown={(e) => handleKeyDown(e, index, "Actual_Value")}
                        className="w-full h-10 px-3 text-right bg-transparent border-0 focus:ring-2 focus:ring-primary focus:bg-background outline-none font-bold text-foreground disabled:opacity-50 transition-all"
                      />
                      {isUpdatingLine === index && (
                        <div className="absolute right-1 top-1">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* EDITABLE COLUMN: Actual Text */}
                  <td className="p-0 border-r border-dashed border-muted-foreground/20 bg-primary/5 group-hover:bg-primary/10 transition-colors">
                    <input
                      type="text"
                      defaultValue={line.Actual_Text || ""}
                      data-row={index}
                      data-field="Actual_Text"
                      disabled={isReadOnly || (isUpdatingLine === index)}
                      onBlur={(e) => handleCellSave(index, "Actual_Text", e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, "Actual_Text")}
                      className="w-full h-10 px-3 text-left bg-transparent border-0 focus:ring-2 focus:ring-primary focus:bg-background outline-none italic text-foreground disabled:opacity-50 transition-all font-medium"
                    />
                  </td>

                  <td className="p-3 align-middle text-right whitespace-nowrap font-medium">{line.Deviation_Percent}%</td>
                  <td className="p-3 align-middle text-right whitespace-nowrap text-muted-foreground">{line.Max_Deviation_Allowed}</td>
                  <td className="p-3 align-middle text-center">
                    <span className={line.Rejection ? "text-red-500 font-bold" : "text-muted-foreground"}>
                      {line.Rejection ? "Y" : "N"}
                    </span>
                  </td>
                  <td className="p-3 align-middle text-right whitespace-nowrap text-muted-foreground">{line.Rejected_Qty}</td>
                  <td className="p-3 align-middle text-center">
                     <span className={line.Mandatory ? "text-primary font-bold" : "text-muted-foreground"}>
                      {line.Mandatory ? "Y" : "N"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
