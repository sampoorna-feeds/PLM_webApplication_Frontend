"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { QCReceiptLine } from "@/lib/api/services/qc-receipt.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2, Save } from "lucide-react";
import { useState } from "react";
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
  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted sticky top-0 z-10 [&_tr]:border-b">
            <tr className="border-b transition-colors text-[10px] uppercase tracking-wider font-bold">
              <th className="h-10 px-3 py-3 text-left w-12">Edit</th>
              <th className="h-10 px-3 py-3 text-left">Line No</th>
              <th className="h-10 px-3 py-3 text-left">Parameter</th>
              <th className="h-10 px-3 py-3 text-left">Description</th>
              <th className="h-10 px-3 py-3 text-left">Method</th>
              <th className="h-10 px-3 py-3 text-left">Type</th>
              <th className="h-10 px-3 py-3 text-left">UOM</th>
              <th className="h-10 px-3 py-3 text-right">Min</th>
              <th className="h-10 px-3 py-3 text-right">Max</th>
              <th className="h-10 px-3 py-3 text-right">Text Value</th>
              <th className="h-10 px-3 py-3 text-right">Actual Value</th>
              <th className="h-10 px-3 py-3 text-left">Actual Text</th>
              <th className="h-10 px-3 py-3 text-right text-[9px] leading-tight">Dev %</th>
              <th className="h-10 px-3 py-3 text-right text-[9px] leading-tight">Max Dev</th>
              <th className="h-10 px-3 py-3 text-center text-[9px]">Rej</th>
              <th className="h-10 px-3 py-3 text-right text-[9px]">Rej Qty</th>
              <th className="h-10 px-3 py-3 text-center text-[9px]">Mand</th>
              <th className="h-10 px-3 py-3 text-center">Result</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0 text-[11px]">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="border-b transition-colors text-xs">
                  {Array.from({ length: 18 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="p-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={18} className="text-muted-foreground h-24 text-center align-middle">
                  No line items found.
                </td>
              </tr>
            ) : (
              lines.map((line, index) => (
                <tr key={`${line.No}-${line.Line_No}-${index}`} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-2 align-middle text-center">
                    {!isReadOnly && (
                      <EditPopover 
                        line={line} 
                        onSave={(updated) => onUpdate?.(index, updated)} 
                      />
                    )}
                  </td>
                  <td className="p-3 align-middle whitespace-nowrap">{line.Line_No}</td>
                  <td className="p-3 align-middle whitespace-nowrap font-medium">{line.Quality_Parameter_Code || "-"}</td>
                  <td className="p-3 align-middle whitespace-nowrap">{line.Description || "-"}</td>
                  <td className="p-3 align-middle whitespace-nowrap">{line.Method_Description || "-"}</td>
                  <td className="p-3 align-middle whitespace-nowrap">{line.Type || "-"}</td>
                  <td className="p-3 align-middle whitespace-nowrap">{line.Unit_of_Measure_Code || "-"}</td>
                  <td className="p-3 align-middle text-right whitespace-nowrap">{line.Min_Value}</td>
                  <td className="p-3 align-middle text-right whitespace-nowrap">{line.Max_Value}</td>
                  <td className="p-3 align-middle text-right whitespace-nowrap">{line.Text_Value || "-"}</td>
                  <td className="p-3 align-middle text-right whitespace-nowrap font-medium text-foreground italic">
                    {line.Actual_Value}
                  </td>
                  <td className="p-3 align-middle whitespace-nowrap italic text-foreground">
                    {line.Actual_Text || "-"}
                  </td>
                  <td className="p-3 align-middle text-right whitespace-nowrap">{line.Deviation_Percent}%</td>
                  <td className="p-3 align-middle text-right whitespace-nowrap">{line.Max_Deviation_Allowed}</td>
                  <td className="p-3 align-middle text-center">
                    <span className={line.Rejection ? "text-red-500 font-bold" : "text-muted-foreground"}>
                      {line.Rejection ? "Y" : "N"}
                    </span>
                  </td>
                  <td className="p-3 align-middle text-right whitespace-nowrap">{line.Rejected_Qty}</td>
                  <td className="p-3 align-middle text-center">
                     <span className={line.Mandatory ? "text-primary font-bold" : "text-muted-foreground"}>
                      {line.Mandatory ? "Y" : "N"}
                    </span>
                  </td>
                  <td className="p-3 align-middle text-center whitespace-nowrap">
                    {line.Result?.trim() ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        line.Result === "Pass" ? "bg-green-100 text-green-700 font-bold" : 
                        line.Result === "Fail" ? "bg-red-100 text-red-700 font-bold" : 
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {line.Result}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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

function EditPopover({ 
  line, 
  onSave 
}: { 
  line: QCReceiptLine; 
  onSave: (updated: QCReceiptLine) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [actualValue, setActualValue] = useState(line.Actual_Value);
  const [actualText, setActualText] = useState(line.Actual_Text);
  const { updateLine, isUpdating } = useQCReceiptLineUpdate();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateLine(line.No, line.Line_No, line["@odata.etag"] || "*", {
      Actual_Value: actualValue,
      Actual_Text: actualText,
    });
    
    if (result) {
      onSave(result);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-primary transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="right">
        <form onSubmit={handleSave} className="grid gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-xs uppercase tracking-tight">Edit Quality Parameter</h4>
            <p className="text-[10px] text-muted-foreground uppercase">
              {line.Quality_Parameter_Code}: {line.Description}
            </p>
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="actual-value" className="text-xs font-bold uppercase tracking-tighter">Actual Value</Label>
              <Input
                id="actual-value"
                type="number"
                step="any"
                className="col-span-2 h-8 text-xs font-medium"
                value={actualValue}
                onChange={(e) => setActualValue(Number(e.target.value))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="actual-text" className="text-xs font-bold uppercase tracking-tighter">Actual Text</Label>
              <Input
                id="actual-text"
                className="col-span-2 h-8 text-xs font-medium"
                value={actualText}
                onChange={(e) => setActualText(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button 
              type="submit" 
              size="sm" 
              disabled={isUpdating}
              className="h-8 gap-2 px-4 text-xs font-bold"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}



