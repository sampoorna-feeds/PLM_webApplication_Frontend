"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { QCReceiptLine } from "@/lib/api/services/qc-receipt.service";

interface QCReceiptLinesTableProps {
  lines: QCReceiptLine[];
  isLoading: boolean;
}

export function QCReceiptLinesTable({
  lines,
  isLoading,
}: QCReceiptLinesTableProps) {
  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted sticky top-0 z-10 [&_tr]:border-b">
            <tr className="border-b transition-colors">
              <th className="text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap">
                Parameter Code
              </th>
              <th className="text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap">
                Description
              </th>
              <th className="text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap">
                UOM
              </th>
              <th className="text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap">
                Type
              </th>
              <th className="text-foreground h-10 px-3 py-3 text-right align-middle text-xs font-bold whitespace-nowrap">
                Min Value
              </th>
              <th className="text-foreground h-10 px-3 py-3 text-right align-middle text-xs font-bold whitespace-nowrap">
                Max Value
              </th>
              <th className="text-foreground h-10 px-3 py-3 text-right align-middle text-xs font-bold whitespace-nowrap">
                Actual Value
              </th>
              <th className="text-foreground h-10 px-3 py-3 text-center align-middle text-xs font-bold whitespace-nowrap">
                Result
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="border-b transition-colors">
                  {Array.from({ length: 8 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="p-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted-foreground h-24 text-center align-middle">
                  No line items found.
                </td>
              </tr>
            ) : (
              lines.map((line, index) => (
                <tr key={`${line.No}-${line.Line_No}-${index}`} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-3 align-middle text-xs whitespace-nowrap">
                    {line.Quality_Parameter_Code || "-"}
                  </td>
                  <td className="p-3 align-middle text-xs whitespace-nowrap">
                    {line.Description || "-"}
                  </td>
                  <td className="p-3 align-middle text-xs whitespace-nowrap">
                    {line.Unit_of_Measure_Code || "-"}
                  </td>
                  <td className="p-3 align-middle text-xs whitespace-nowrap">
                    {line.Type || "-"}
                  </td>
                  <td className="p-3 align-middle text-xs text-right whitespace-nowrap">
                    {line.Min_Value}
                  </td>
                  <td className="p-3 align-middle text-xs text-right whitespace-nowrap">
                    {line.Max_Value}
                  </td>
                  <td className="p-3 align-middle text-xs text-right whitespace-nowrap font-medium">
                    {line.Actual_Value}
                  </td>
                  <td className="p-3 align-middle text-xs text-center whitespace-nowrap">
                    {line.Result?.trim() ? (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        line.Result === "Pass" ? "bg-green-100 text-green-700" : 
                        line.Result === "Fail" ? "bg-red-100 text-red-700" : 
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
