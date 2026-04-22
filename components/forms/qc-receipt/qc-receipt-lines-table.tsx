"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { QCReceiptLine } from "@/lib/api/services/qc-receipt.service";
import { Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { useQCReceiptLineUpdate } from "./use-qc-receipts";
import { toast } from "sonner";

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
    
    // Validation: prevent negative values for Actual_Value
    if (field === "Actual_Value" && typeof value === "number" && value < 0) {
      toast.error("Negative values are not allowed for Actual Value");
      return;
    }

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
      
      const value = field === "Actual_Value" ? Number(e.currentTarget.value) : e.currentTarget.value;
      
      // Validation check before moving down
      if (field === "Actual_Value" && typeof value === "number" && value < 0) {
        toast.error("Negative values are not allowed");
        return;
      }

      // Save current cell value
      handleCellSave(index, field, value);

      // Focus next row's cell in same column
      const nextRow = index + 1;
      if (nextRow < lines.length) {
        const nextInput = tableRef.current?.querySelector(
          `input[data-row="${nextRow}"][data-field="${field}"]:not(:disabled)`
        ) as HTMLInputElement;
        
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        } else {
            // Scan for next enabled input
            let scanRow = nextRow + 1;
            while(scanRow < lines.length) {
                const scanInput = tableRef.current?.querySelector(
                    `input[data-row="${scanRow}"][data-field="${field}"]:not(:disabled)`
                ) as HTMLInputElement;
                if(scanInput) {
                    scanInput.focus();
                    scanInput.select();
                    break;
                }
                scanRow++;
            }
        }
      }
    }
  };

  const isTextField = (type?: string) => {
    if (!type) return false;
    return type.toLowerCase() === "text";
  };

  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full caption-bottom text-sm border-collapse">
          <thead className="bg-muted sticky top-0 z-10 border-b text-muted-foreground">
            <tr className="text-[10px] uppercase tracking-wider font-semibold">
              <th className="h-10 px-3 py-3 text-left">Description</th>
              <th className="h-10 px-3 py-3 text-left w-[80px]">Type</th>
              <th className="h-10 px-3 py-3 text-left w-[80px]">UOM</th>
              <th className="h-10 px-3 py-3 text-right">Min</th>
              <th className="h-10 px-3 py-3 text-right">Max</th>
              <th className="h-10 px-3 py-3 text-right">Text Val.</th>
              <th className="h-10 px-3 py-3 text-right w-[110px]">Actual Val.</th>
              <th className="h-10 px-3 py-3 text-left w-[170px]">Actual Text</th>
              <th className="h-10 px-3 py-3 text-right text-[9px] leading-tight font-bold">Dev %</th>
              <th className="h-10 px-3 py-3 text-right text-[9px] leading-tight w-[60px]">Max Dev</th>
              <th className="h-10 px-3 py-3 text-center text-[9px] w-[40px]">Rej</th>
              <th className="h-10 px-3 py-3 text-right text-[9px] w-[70px]">Rej Qty</th>
              <th className="h-10 px-3 py-3 text-center text-[9px] w-[50px]">Mand</th>
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
              lines.map((line, index) => {
                const isText = isTextField(line.Type);
                
                return (
                  <tr key={`${line.No}-${line.Line_No}-${index}`} className="border-b transition-colors hover:bg-muted/30 group">
                    <td className="p-3 align-middle whitespace-nowrap font-medium text-foreground/80">{line.Description || "-"}</td>
                    <td className="p-3 align-middle whitespace-nowrap text-muted-foreground capitalize">{line.Type || "-"}</td>
                    <td className="p-3 align-middle whitespace-nowrap text-muted-foreground">{line.Unit_of_Measure_Code || "-"}</td>
                    <td className="p-3 align-middle text-right whitespace-nowrap text-muted-foreground/70">{line.Min_Value}</td>
                    <td className="p-3 align-middle text-right whitespace-nowrap text-muted-foreground/70">{line.Max_Value}</td>
                    <td className="p-3 align-middle text-right whitespace-nowrap text-muted-foreground/70">{line.Text_Value || "-"}</td>
                    
                    {/* ACTUAL VALUE COLUMN */}
                    <td className={`p-0 border-x border-dashed border-muted-foreground/10 transition-colors ${!isText ? "bg-primary/5 group-hover:bg-primary/10" : "bg-muted/5"}`}>
                      <div className="relative h-10">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          defaultValue={line.Actual_Value}
                          data-row={index}
                          data-field="Actual_Value"
                          disabled={isReadOnly || isText || (isUpdatingLine === index)}
                          onBlur={(e) => !isText && handleCellSave(index, "Actual_Value", Number(e.target.value))}
                          onKeyDown={(e) => !isText && handleKeyDown(e, index, "Actual_Value")}
                          className={`w-full h-full px-3 text-right bg-transparent border-0 outline-none font-bold text-foreground transition-all 
                            ${!isText ? "focus:ring-2 focus:ring-primary focus:bg-background cursor-text" : "cursor-not-allowed opacity-60"}`}
                        />
                        {isUpdatingLine === index && !isText && (
                          <div className="absolute right-1 top-1">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          </div>
                        )}
                        {isText && !line.Actual_Value && (
                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                             <span className="text-[9px] font-bold">N/A</span>
                           </div>
                        )}
                      </div>
                    </td>

                    {/* ACTUAL TEXT COLUMN */}
                    <td className={`p-0 border-r border-dashed border-muted-foreground/10 transition-colors ${isText ? "bg-primary/5 group-hover:bg-primary/10" : "bg-muted/5"}`}>
                      <div className="relative h-10">
                        <input
                          type="text"
                          defaultValue={line.Actual_Text || ""}
                          data-row={index}
                          data-field="Actual_Text"
                          disabled={isReadOnly || !isText || (isUpdatingLine === index)}
                          onBlur={(e) => isText && handleCellSave(index, "Actual_Text", e.target.value)}
                          onKeyDown={(e) => isText && handleKeyDown(e, index, "Actual_Text")}
                          className={`w-full h-full px-3 text-left bg-transparent border-0 outline-none italic text-foreground transition-all font-medium
                            ${isText ? "focus:ring-2 focus:ring-primary focus:bg-background cursor-text" : "cursor-not-allowed opacity-60"}`}
                        />
                        {isUpdatingLine === index && isText && (
                          <div className="absolute right-1 top-1">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          </div>
                        )}
                        {!isText && !line.Actual_Text && (
                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                             <span className="text-[9px] font-bold">N/A</span>
                           </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3 align-middle text-right whitespace-nowrap font-bold text-foreground">{line.Deviation_Percent}%</td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
